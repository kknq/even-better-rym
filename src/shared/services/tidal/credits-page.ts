import type { TrackCredit } from "../types";

export type TidalTrackCredits = { id: string; credits: TrackCredit[] };
export type TidalCreditsInput = { albumId: string; trackIds: string[] };
export type TidalCreditsResult =
	| { tracks: TidalTrackCredits[] }
	| { error: string };

export function isTidalCreditsInput(
	value: unknown,
): value is TidalCreditsInput {
	return (
		typeof value === "object" &&
		value !== null &&
		"albumId" in value &&
		typeof value.albumId === "string" &&
		/^\d+$/.test(value.albumId) &&
		"trackIds" in value &&
		Array.isArray(value.trackIds) &&
		value.trackIds.length > 0 &&
		value.trackIds.every(
			(id: unknown) => typeof id === "string" && /^\d+$/.test(id),
		) &&
		new Set(value.trackIds).size === value.trackIds.length
	);
}

export function isTidalCreditsResult(
	value: unknown,
): value is TidalCreditsResult {
	if (typeof value !== "object" || value === null) return false;
	if ("error" in value) {
		return typeof value.error === "string" && value.error.trim().length > 0;
	}
	return (
		"tracks" in value &&
		Array.isArray(value.tracks) &&
		value.tracks.every(
			(track: unknown) =>
				typeof track === "object" &&
				track !== null &&
				"id" in track &&
				typeof track.id === "string" &&
				/^\d+$/.test(track.id) &&
				"credits" in track &&
				Array.isArray(track.credits) &&
				track.credits.every(
					(credit: unknown) =>
						typeof credit === "object" &&
						credit !== null &&
						"name" in credit &&
						typeof credit.name === "string" &&
						credit.name.trim().length > 0 &&
						"role" in credit &&
						typeof credit.role === "string" &&
						credit.role.trim().length > 0,
				),
		)
	);
}

export function readTidalCreditsPage(
	albumId: string,
	trackIds: string[],
): Promise<TidalCreditsResult> {
	return new Promise((resolve) => {
		const finish = (result: TidalCreditsResult) => {
			observer.disconnect();
			clearTimeout(timeout);
			resolve(result);
		};
		const read = () => {
			if (
				location.origin !== "https://tidal.com" ||
				location.pathname !== `/album/${albumId}/credits`
			) {
				finish({ error: "Tidal credits page redirected to an unexpected URL" });
				return;
			}
			const blocks = document.querySelectorAll('main [class*="_credits_"]');
			const tracks = new Map<string, TidalTrackCredits>();
			for (const block of blocks) {
				const id = block
					.querySelector("[data-test-id]")
					?.getAttribute("data-test-id");
				const body = block.querySelector('[class*="_mediaCredits_"]');
				if (!id) continue;
				if (tracks.has(id)) {
					finish({ error: "Tidal returned duplicate track credits" });
					return;
				}
				const credits: TrackCredit[] = [];
				const cells = body?.querySelectorAll('[class*="_creditsCell_"]') ?? [];
				if (body && cells.length === 0) {
					finish({ error: "Could not parse Tidal credit groups" });
					return;
				}
				for (const cell of cells) {
					const label = cell.querySelector("[data-uppercase]");
					const role = label?.textContent?.trim();
					const people = label?.nextElementSibling?.querySelectorAll(
						'[data-test="grid-item-detail-text-title-artist"]',
					);
					if (!role || !people?.length) {
						finish({ error: "Could not parse Tidal credit names or roles" });
						return;
					}
					for (const person of people) {
						const name = person.textContent?.trim();
						if (!name) {
							finish({ error: "Could not parse Tidal credit name" });
							return;
						}
						credits.push({ name, role });
					}
				}
				tracks.set(id, { id, credits });
			}
			if (trackIds.every((id) => tracks.has(id))) {
				if (tracks.size !== trackIds.length) {
					finish({
						error: "Tidal credits do not match the imported tracklist",
					});
					return;
				}
				finish({ tracks: [...tracks.values()] });
			}
		};
		const observer = new MutationObserver(read);
		const timeout = setTimeout(
			() =>
				finish({
					error:
						"Tidal credits did not finish loading. Open the album's credits page to check availability.",
				}),
			25_000,
		);
		observer.observe(document.documentElement, {
			childList: true,
			subtree: true,
			characterData: true,
		});
		read();
	});
}
