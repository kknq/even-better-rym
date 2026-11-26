import type { SearchFunction } from "./types";

export const normalizeSearchText = (value: string): string =>
	value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();

const latinLetters: Readonly<Record<string, string>> = {
	æ: "ae",
	ð: "d",
	ø: "o",
	þ: "th",
	ß: "ss",
	đ: "d",
	ł: "l",
	œ: "oe",
};

export const normalizeSearchArtist = (name: string): string =>
	normalizeSearchText(name)
		.normalize("NFKD")
		.replace(/\p{M}/gu, "")
		.replace(/[æðøþßđłœ]/g, (letter) => latinLetters[letter]);

export const getSearchArtists = (artist: string, alias?: string): string[] => {
	const name = artist.trim();
	const alternate = alias?.trim();
	return alternate &&
		normalizeSearchText(alternate) !== normalizeSearchText(name)
		? [name, alternate]
		: [name];
};

export const withArtistAlias =
	(search: SearchFunction): SearchFunction =>
	async (metadata) => {
		const result = await search(metadata);
		if (result !== undefined) return result;

		const artists = getSearchArtists(metadata.artist, metadata.artistAlias);
		const attempted = new Set([normalizeSearchText(metadata.artist)]);
		const candidates = [
			...artists.slice(1),
			...artists.map((name) => normalizeSearchArtist(name)),
		];
		for (const artist of candidates) {
			const name = normalizeSearchText(artist);
			if (attempted.has(name)) continue;
			attempted.add(name);
			const result = await search({
				...metadata,
				artist,
				artistAlias: metadata.artist,
			});
			if (result !== undefined) return result;
		}
		return undefined;
	};

export const isReissueTitle = (candidate: string, title: string): boolean => {
	const normalized = normalizeSearchText(candidate);
	const original = normalizeSearchText(title);
	return (
		original.length > 0 &&
		normalized.startsWith(original) &&
		/^(?:\s*\((?:переиздание|reissue|reissued)\)|\s*\[(?:переиздание|reissue|reissued)\]|\s+[-–—]\s+(?:переиздание|reissue|reissued))$/u.test(
			normalized.slice(original.length),
		)
	);
};
