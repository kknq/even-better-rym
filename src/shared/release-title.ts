import { getSearchArtistMetadata } from "./search-artist";

export type ReleaseTitleData = {
	albumTitle: string;
	artistName: string;
	nativeAlbumTitle?: string;
	nativeArtistName?: string;
};

export const getReleaseTitleData = (): ReleaseTitleData | undefined => {
	const titleElement = document.querySelector<HTMLElement>(".album_title");
	const artistElement = titleElement?.querySelector<HTMLElement>(".artist");
	if (!titleElement || !artistElement) return undefined;
	const artist = getSearchArtistMetadata(
		artistElement.textContent ?? "",
		artistElement.querySelector(".subtext")?.textContent ?? null,
	);
	const artistName = artist.artistAlias ?? artist.artist;
	if (!artistName) return undefined;

	const titleText =
		titleElement.querySelector(":scope > .ebr-reference-title-text") ??
		titleElement;
	const latinTitle = Array.from(titleText.children)
		.find(
			(element) =>
				element.tagName === "SPAN" &&
				!element.matches(".album_artist_small, .ebr-reference-links"),
		)
		?.textContent?.trim();
	const originalTitle = Array.from(titleText.childNodes)
		.filter((node) => node.nodeType === Node.TEXT_NODE)
		.map((node) => node.textContent ?? "")
		.join(" ")
		.trim();
	const albumTitle = latinTitle?.length ? latinTitle : originalTitle;
	if (!albumTitle) return undefined;

	const nativeAlbumTitle = Array.from(titleText.childNodes)
		.filter((node) => node.nodeType === Node.TEXT_NODE)
		.map((node) => node.textContent ?? "")
		.join(" ")
		.trim();
	const nativeArtistName = artist.artist;
	return {
		albumTitle,
		artistName,
		...(nativeAlbumTitle && nativeAlbumTitle !== albumTitle
			? { nativeAlbumTitle }
			: {}),
		...(nativeArtistName && nativeArtistName !== artistName
			? { nativeArtistName }
			: {}),
	};
};
