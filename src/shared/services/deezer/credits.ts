import { fetch } from "~/shared/utils/fetch";
import { normalizeCreditRole } from "../credit-roles";
import type { TrackCredit } from "../types";

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export type SongDetails = { artists: string[]; credits: TrackCredit[] };

export function readSongDetails(document_: Document, id: string): SongDetails {
	const assignment = [...document_.querySelectorAll("script")]
		.map((script) =>
			/^\s*window\.__DZR_APP_STATE__\s*=\s*(\{[\s\S]*\})\s*;?\s*$/.exec(
				script.textContent ?? "",
			),
		)
		.find((match) => match !== null);
	if (!assignment?.[1]) throw new Error("Deezer song credits are unavailable");
	const state: unknown = JSON.parse(assignment[1]);
	if (
		!isObject(state) ||
		!isObject(state.DATA) ||
		String(state.DATA.SNG_ID) !== id ||
		typeof state.DATA.SNG_TITLE !== "string" ||
		!state.DATA.SNG_TITLE.trim() ||
		!Array.isArray(state.DATA.ARTISTS) ||
		state.DATA.ARTISTS.length === 0 ||
		!isObject(state.DATA.SNG_CONTRIBUTORS)
	) {
		throw new Error("Could not parse Deezer song credits");
	}
	const artists: unknown[] = state.DATA.ARTISTS;
	const names = artists.map((artist) => {
		if (
			!isObject(artist) ||
			typeof artist.ART_NAME !== "string" ||
			!artist.ART_NAME.trim()
		) {
			throw new Error("Could not parse Deezer song artists");
		}
		return artist.ART_NAME.trim();
	});
	const credits: TrackCredit[] = [];
	for (const [sourceRole, contributors] of Object.entries(
		state.DATA.SNG_CONTRIBUTORS,
	)) {
		if (!sourceRole.trim() || !Array.isArray(contributors)) {
			throw new Error("Could not parse Deezer song contributors");
		}
		const roleName = sourceRole.trim().toLowerCase();
		const role = normalizeCreditRole(sourceRole);
		const people: unknown[] = contributors;
		for (const person of people) {
			if (typeof person !== "string" || !person.trim()) {
				throw new Error("Could not parse Deezer song contributor");
			}
			if (roleName !== "main_artist") {
				credits.push({ name: person.trim(), role });
			}
		}
	}
	return { artists: [...new Set(names)], credits };
}

export async function resolveSongDetails(url: string): Promise<SongDetails> {
	const parsed = new URL(url);
	const match = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?track\/(\d+)\/?$/i.exec(
		parsed.pathname,
	);
	if (
		!["https://www.deezer.com", "https://deezer.com"].includes(parsed.origin) ||
		parsed.username ||
		parsed.password ||
		!match?.[1]
	) {
		throw new Error("Unsupported Deezer song credits URL");
	}
	const id = match[1];
	const html = await fetch({
		url: `https://www.deezer.com/en/track/${id}`,
		credentials: "omit",
		headers: { "Accept-Language": "en-US,en;q=0.9" },
	});
	return readSongDetails(
		new DOMParser().parseFromString(html, "text/html"),
		id,
	);
}
