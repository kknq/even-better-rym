export type WikipediaSearchResult = {
	title: string;
	snippet?: string;
};

export const toSlug = (value: string): string =>
	value.trim().replace(/\s+/g, "-").replace(/-+$/g, "");

const normalize = (value: string): string =>
	value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

const hasAlbumTitlePrefix = (title: string, albumTitle: string): boolean => {
	const escapedAlbumTitle = albumTitle
		.trim()
		.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	if (!escapedAlbumTitle) return false;

	return new RegExp(`^${escapedAlbumTitle}(?:$|[^\\p{L}\\p{N}])`, "iu").test(
		title.trim(),
	);
};

export const findBestWikipediaResult = (
	results: WikipediaSearchResult[],
	albumTitle: string,
): WikipediaSearchResult | undefined => {
	const normalizedAlbum = normalize(albumTitle);
	if (!normalizedAlbum) return undefined;

	const candidates = results.flatMap((result) => {
		if (!hasAlbumTitlePrefix(result.title, albumTitle)) return [];

		const normalizedTitle = normalize(result.title);
		const exactTitle = normalizedTitle === normalizedAlbum;
		return [
			{
				result,
				score:
					(exactTitle ? 50 : 0) + (/\balbum\b/i.test(result.title) ? 100 : 0),
			},
		];
	});

	return candidates.sort((a, b) => b.score - a.score)[0]?.result;
};

export const getWikipediaArticleUrl = (title: string): string =>
	`https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
