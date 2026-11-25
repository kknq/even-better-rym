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

	const titleText =
		titleElement.querySelector(":scope > .ebr-reference-title-text") ??
		titleElement;
	const latinTitle = titleText
		.querySelector<HTMLElement>(":scope > span")
		?.textContent?.trim();
	const albumTitle =
		latinTitle ??
		Array.from(titleText.childNodes)
			.filter((node) => node.nodeType === Node.TEXT_NODE)
			.map((node) => node.textContent ?? "")
			.join(" ")
			.trim();
	if (!albumTitle) return undefined;

	return { albumTitle, artistName };
};
