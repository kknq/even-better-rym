import type { SearchFunction } from "./types";

export const normalizeSearchText = (value: string): string =>
	value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();

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

		const [artist, alias] = getSearchArtists(
			metadata.artist,
			metadata.artistAlias,
		);
		if (!alias) return undefined;
		return search({ ...metadata, artist: alias, artistAlias: artist });
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
