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

export const isSpecialCreditRole = (role: string): boolean =>
	["featured", "guest", "remixer"].includes(role.trim().toLowerCase());

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

export function sortCreditsByTrackCoverage<T extends { name: string }>(
	credits: T[],
	tracks: Track[],
	getNames: (track: Track) => string[] = (track) =>
		getTrackCredits(track)
			.filter((credit) => credit.role.trim())
			.map((credit) => credit.name),
): T[] {
	const counts = new Map<string, number>();
	for (const track of tracks) {
		if (track.header) continue;
		const names = new Set(getNames(track).map((name) => name.trim()));
		for (const name of names) {
			if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
		}
	}
	const blocks = new Map<string, T[]>();
	for (const credit of credits) {
		const block = blocks.get(credit.name) ?? [];
		block.push(credit);
		blocks.set(credit.name, block);
	}
	return [...blocks]
		.sort(
			([a], [b]) =>
				(counts.get(b.trim()) ?? 0) - (counts.get(a.trim()) ?? 0) ||
				a.localeCompare(b, undefined, { sensitivity: "base" }),
		)
		.flatMap(([, block]) => block);
}

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
	const grouped = new Map<string, CreditSuggestion>();
	for (const { trackIndexes, ...suggestion } of suggestions.values()) {
		const groupKey = JSON.stringify([
			suggestion.name,
			[...trackIndexes],
			isSpecialCreditRole(suggestion.role) ? suggestion.role : null,
		]);
		const previous = grouped.get(groupKey);
		const role = previous
			? `${previous.role}, ${suggestion.role}`
			: suggestion.role;
		grouped.set(groupKey, {
			...suggestion,
			key: creditKey(suggestion.name, role),
			role,
			positions: trackIndexes.size === trackCount ? [] : suggestion.positions,
		});
	}
	return [...grouped.values()];
}
