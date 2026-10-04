export type ReleaseTitleData = {
	albumTitle: string;
	artistName: string;
};

export const getReleaseTitleData = (): ReleaseTitleData | undefined => {
	const titleElement = document.querySelector<HTMLElement>(".album_title");
	const artistName = titleElement
		?.querySelector<HTMLElement>(".artist")
		?.textContent?.trim();
	if (!titleElement || !artistName) return undefined;

	const latinTitle = titleElement
		.querySelector<HTMLElement>(":scope > span")
		?.textContent?.trim();
	const albumTitle =
		latinTitle ??
		Array.from(titleElement.childNodes)
			.filter((node) => node.nodeType === Node.TEXT_NODE)
			.map((node) => node.textContent ?? "")
			.join(" ")
			.trim();
	if (!albumTitle) return undefined;

	return { albumTitle, artistName };
};
