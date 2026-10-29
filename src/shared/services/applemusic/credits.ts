import { fetch } from "~/shared/utils/fetch";
import { normalizeCreditRole } from "../credit-roles";
import type { TrackCredit } from "../types";

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export function readSongCredits(document_: Document): TrackCredit[] {
	const script = [...document_.querySelectorAll("script")].find((item) =>
		item.textContent?.includes('"songDetailItemLockup"'),
	);
	if (!script) throw new Error("Apple Music song credits are unavailable");
	const data: unknown = JSON.parse(script.textContent ?? "");
	const credits: TrackCredit[] = [];
	const visit = (value: unknown): void => {
		if (Array.isArray(value)) {
			value.forEach(visit);
		} else if (isObject(value)) {
			if (value.itemKind === "songDetailItemLockup") {
				if (!Array.isArray(value.items)) {
					throw new Error("Invalid Apple Music song credit section");
				}
				const items: unknown[] = value.items;
				for (const item of items) {
					if (!isObject(item) || !Array.isArray(item.roleNames)) continue;
					if (typeof item.name !== "string" || !item.name.trim()) continue;
					const roles: unknown[] = item.roleNames;
					for (const role of roles) {
						if (typeof role !== "string" || !role.trim()) continue;
						credits.push({
							name: item.name.trim(),
							role: normalizeCreditRole(role),
						});
					}
				}
				return;
			}
			Object.values(value).forEach(visit);
		}
	};
	visit(data);
	return credits;
}

export async function resolveSongCredits(url: string): Promise<TrackCredit[]> {
	const parsed = new URL(url);
	if (
		parsed.protocol !== "https:" ||
		parsed.hostname !== "music.apple.com" ||
		!/^\/[a-z]{2}\/song\/[^/]+\/\d+$/.test(parsed.pathname)
	) {
		throw new Error("Unsupported Apple Music song credits URL");
	}
	parsed.search = "";
	parsed.hash = "";
	parsed.searchParams.set("l", "en-US");
	const html = await fetch({
		url: parsed.href,
		headers: { "Accept-Language": "en-US,en;q=0.9" },
	});
	return readSongCredits(new DOMParser().parseFromString(html, "text/html"));
}
