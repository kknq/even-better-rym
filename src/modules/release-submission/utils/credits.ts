import { uniqueBy } from "~/shared/utils/array";
import { forceQuerySelector } from "~/shared/utils/dom";

import { selectShortcut } from "./page-functions";

export type Artist = {
	id: number;
	name: string;
};

function getArtistId(value: string): number | undefined {
	const match = /\[Artist(\d+)(?:,[^\]]*)?\]/i.exec(value);
	return match ? Number(match[1]) : undefined;
}

function hasRole(value: string, role: string): boolean {
	return value
		.split(",")
		.some((value) => value.trim().toLowerCase() === role.toLowerCase());
}

export function getFiledUnderArtists(): Artist[] {
	const nodes = document.querySelectorAll(
		".sortable_filed_under_performer .filed_under_artist, .sortable_filed_under .filed_under_artist",
	);
	return uniqueBy((artist: Artist) => artist.id)(
		[...nodes].flatMap((node): Artist[] => {
			const link = node.querySelector<HTMLAnchorElement>("a.artist");
			const input = node.querySelector<HTMLInputElement>("input");
			const id =
				getArtistId(input?.value ?? "") ?? getArtistId(link?.title ?? "");
			const name = link?.textContent?.trim();
			return id !== undefined && name ? [{ id, name }] : [];
		}),
	);
}

export async function fillFiledUnderCredits(role: string): Promise<void> {
	for (const artist of getFiledUnderArtists()) {
		const rows = [
			...document.querySelectorAll<HTMLElement>("#creditsx li.sortable_credit"),
		];
		const existing = rows.filter(
			(row) =>
				getArtistId(
					row.querySelector<HTMLInputElement>(".credits_artist input")?.value ??
						"",
				) === artist.id &&
				row
					.querySelector<HTMLInputElement>(".credits_tracks input")
					?.value.trim() === "",
		);
		let row: HTMLElement | undefined =
			existing.find((candidate) =>
				hasRole(
					forceQuerySelector<HTMLInputElement>(candidate)(
						".credits_roles input",
					).value,
					role,
				),
			) ?? existing[0];
		if (!row) {
			await selectShortcut("a", artist.id, artist.name, "credits");
			row = [
				...document.querySelectorAll<HTMLElement>(
					"#creditsx li.sortable_credit",
				),
			].find(
				(candidate) =>
					!rows.includes(candidate) &&
					getArtistId(
						candidate.querySelector<HTMLInputElement>(".credits_artist input")
							?.value ?? "",
					) === artist.id,
			);
			if (!row) {
				throw new Error(`Could not add ${role} credit for ${artist.name}`);
			}
		}
		const roles = forceQuerySelector<HTMLInputElement>(row)(
			".credits_roles input",
		);
		if (!hasRole(roles.value, role)) {
			roles.value = [roles.value.trim(), role].filter(Boolean).join(", ");
		}
	}
}
