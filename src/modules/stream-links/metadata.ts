export const getSearchArtistName = (
	artist: string,
	subtext: string | null = null,
): string => {
	const name = artist.trim();
	const annotation = subtext?.trim();
	return annotation && name.endsWith(annotation)
		? name.slice(0, -annotation.length).trim()
		: name;
};
