export const stripDiscogsArtistDisambiguator = (name: string): string =>
	name.trim().replace(/\s+\(\d+\)$/, "");
