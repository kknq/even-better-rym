import type { SearchFunction } from "./types";

export const normalizeSearchText = (value: string): string =>
	value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();

export const normalizeSearchTitle = (value: string): string =>
	normalizeSearchText(value)
		.replace(/\b(?:volume|vol\.?)(?=\s*\d)/g, "vol.")
		.replace(/\s*[:,]\s*(vol\.\s*\d+)\b/g, " $1")
		.replace(/\b(vol\.\s*\d+)\s*(?:[:,]|\s[-–—])\s*/g, "$1 ");

export const getSearchTitleVariants = (title: string): string[] => {
	if (!/\b(?:volume|vol\.?)(?=\s*\d)/i.test(title)) return [title];
	const abbreviated = title.replace(/\b(?:volume|vol\.?)(?=\s*\d)/gi, "Vol.");
	const alternate = abbreviated
		.replace(/\s*:\s*(Vol\.\s*\d+)\b/g, ", $1")
		.replace(/\b(Vol\.\s*\d+)\s+[-–—]\s*/g, "$1: ");
	const expanded = abbreviated.replace(/\bVol\.(?=\s*\d)/g, "Volume");
	const expandedAlternate = expanded
		.replace(/\s*,\s*(Volume\s*\d+)\b/g, ": $1")
		.replace(/\b(Volume\s*\d+)\s*:\s*/g, "$1 - ");
	return [
		...new Set([title, abbreviated, alternate, expanded, expandedAlternate]),
	];
};

export const withSearchTitleVariants =
	(search: SearchFunction): SearchFunction =>
	async (metadata) => {
		for (const title of getSearchTitleVariants(metadata.title)) {
			const result = await search({ ...metadata, title });
			if (result !== undefined) return result;
		}
		return undefined;
	};

export const getAlbumSearchQuery = (artist: string, title: string): string =>
	normalizeSearchText(artist) === "various artists"
		? title
		: `${artist} ${title}`;

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
	const normalized = normalizeSearchTitle(candidate);
	const original = normalizeSearchTitle(title);
	return (
		original.length > 0 &&
		normalized.startsWith(original) &&
		/^(?:\s*\((?:переиздание|reissue|reissued)\)|\s*\[(?:переиздание|reissue|reissued)\]|\s+[-–—]\s+(?:переиздание|reissue|reissued))$/u.test(
			normalized.slice(original.length),
		)
	);
};
