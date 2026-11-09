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

export const getSearchArtistMetadata = (
	artist: string,
	subtext: string | null = null,
): { artist: string; artistAlias?: string } => {
	const name = getSearchArtistName(artist, subtext);
	const alias = /^\[([^[\]]+)\]$/.exec(subtext?.trim() ?? "")?.[1].trim();
	return {
		artist: name,
		...(alias && alias !== name ? { artistAlias: alias } : {}),
	};
};
