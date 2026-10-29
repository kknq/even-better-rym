import type { Track, TrackCredit } from "~/shared/services/types";
import { normalizeArtistName } from "./release-artist-links";
import { getTrackPosition } from "./track-position";

const FEATURED_ARTIST_PATTERN =
	/\s*(?:\(\s*(?:feat\.?|featuring)\s+([^()]+)\)|\[\s*(?:feat\.?|featuring)\s+([^[\]]+)\])\s*/gi;

export const stripFeaturedArtistTags = (title: string): string => {
	const stripped = title.replace(FEATURED_ARTIST_PATTERN, " ");
	return stripped === title ? title : stripped.trim();
};

export type CreditSuggestion = TrackCredit & {
	key: string;
	positions: string[];
};

export const creditKey = (name: string, role: string): string =>
	JSON.stringify([name, role]);

export function getFeaturedArtists(
	title: string,
	knownArtists: string[] = [],
): string[] {
	const artists = new Set<string>();
	for (const match of title.matchAll(FEATURED_ARTIST_PATTERN)) {
		const credited = (match[1] ?? match[2] ?? "").trim();
		if (knownArtists.includes(credited)) {
			artists.add(credited);
			continue;
		}
		for (const name of credited.split(/\s*(?:,|&|;|\band\b)\s*/i)) {
			if (name.trim()) artists.add(name.trim());
		}
	}
	return [...artists];
}

export const getTrackCredits = (track: Track): TrackCredit[] => [
	...(track.credits ?? []),
	...getFeaturedArtists(track.title ?? "", track.artists).map((name) => ({
		name,
		role: "featured",
	})),
];

export function getNonFeaturedTrackArtists(track: Track): string[] {
	if (track.header) return [];
	const featuredNames = new Set(
		getTrackCredits(track)
			.filter((credit) => credit.role.trim().toLowerCase() === "featured")
			.map((credit) => normalizeArtistName(credit.name)),
	);
	return (track.artists ?? []).filter(
		(name) => !featuredNames.has(normalizeArtistName(name)),
	);
}

export function getSuggestedCredits(tracks: Track[]): CreditSuggestion[] {
	const suggestions = new Map<
		string,
		CreditSuggestion & { trackIndexes: Set<number> }
	>();
	const trackCount = tracks.filter((track) => !track.header).length;
	for (const [index, track] of tracks.entries()) {
		if (track.header) continue;
		for (const credit of getTrackCredits(track)) {
			const name = credit.name.trim();
			const role = credit.role.trim();
			if (!name || !role) continue;
			const key = creditKey(name, role);
			const suggestion = suggestions.get(key) ?? {
				key,
				name,
				role,
				positions: [],
				trackIndexes: new Set<number>(),
			};
			const position = getTrackPosition(track, index);
			if (!suggestion.positions.includes(position))
				suggestion.positions.push(position);
			suggestion.trackIndexes.add(index);
			suggestions.set(key, suggestion);
		}
	}
	return [...suggestions.values()].map(({ trackIndexes, ...suggestion }) => ({
		...suggestion,
		positions: trackIndexes.size === trackCount ? [] : suggestion.positions,
	}));
}
