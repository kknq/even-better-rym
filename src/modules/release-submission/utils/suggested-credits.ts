import type {
	Track,
	TrackCredit,
	UnverifiedCredit,
} from "~/shared/services/types";
import { normalizeArtistName } from "./release-artist-links";
import { getTrackPosition } from "./track-position";

const FEATURED_ARTIST_PATTERN =
	/\s*(?:\(\s*(?:feat(?:uring)?|ft)\.?\s*([^()]+)\)|\[\s*(?:feat(?:uring)?|ft)\.?\s*([^[\]]+)\]|\s+ft\.?\s+(.+)$)\s*/gi;

export const stripFeaturedArtistTags = (title: string): string => {
	const stripped = title.replace(FEATURED_ARTIST_PATTERN, " ");
	return stripped === title ? title : stripped.trim();
};

export type CreditSuggestion = TrackCredit & {
	key: string;
	positions: string[];
	unverified?: boolean;
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
		const credited = (match[1] ?? match[2] ?? match[3] ?? "").trim();
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

export function sortCreditsByFirstAppearance<T extends { name: string }>(
	credits: T[],
	tracks: Track[],
): T[] {
	const blocks = new Map<string, T[]>();
	for (const credit of credits) {
		const block = blocks.get(credit.name) ?? [];
		block.push(credit);
		blocks.set(credit.name, block);
	}
	const ordered: T[] = [];
	for (const track of tracks) {
		if (track.header) continue;
		for (const credit of getTrackCredits(track)) {
			if (!credit.role.trim()) continue;
			const name = credit.name.trim();
			const block = blocks.get(name);
			if (!block) continue;
			ordered.push(...block);
			blocks.delete(name);
		}
	}
	for (const block of blocks.values()) ordered.push(...block);
	return ordered;
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

type IndexedCreditSuggestion = CreditSuggestion & { trackIndexes: Set<number> };

const addTrackSuggestions = (
	suggestions: Map<string, IndexedCreditSuggestion>,
	track: Track,
	index: number,
): void => {
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
};

const groupCreditSuggestions = (
	suggestions: Iterable<IndexedCreditSuggestion>,
	trackCount: number,
): CreditSuggestion[] => {
	const grouped = new Map<string, CreditSuggestion>();
	for (const { trackIndexes, ...suggestion } of suggestions) {
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
};

export function getSuggestedCredits(
	tracks: Track[],
	releaseCredits: TrackCredit[] = [],
): CreditSuggestion[] {
	const suggestions = new Map<string, IndexedCreditSuggestion>();
	const releaseIndexes = tracks.flatMap((track, index) =>
		track.header ? [] : [index],
	);
	for (const credit of releaseCredits) {
		const name = credit.name.trim();
		const role = credit.role.trim();
		if (!name || !role) continue;
		const key = creditKey(name, role);
		suggestions.set(key, {
			key,
			name,
			role,
			positions: [],
			trackIndexes: new Set(releaseIndexes),
		});
	}
	for (const [index, track] of tracks.entries()) {
		if (!track.header) addTrackSuggestions(suggestions, track, index);
	}
	return groupCreditSuggestions(suggestions.values(), releaseIndexes.length);
}

export function getUnverifiedCreditSuggestions(
	credits: UnverifiedCredit[],
): CreditSuggestion[] {
	const suggestions = new Map<string, CreditSuggestion>();
	for (const credit of credits) {
		const name = credit.name.trim();
		if (!name) continue;
		const sourceRole = credit.role?.trim();
		const role =
			sourceRole === undefined || sourceRole.length === 0 ? "???" : sourceRole;
		const key = JSON.stringify(["unverified", name, role]);
		if (suggestions.has(key)) continue;
		suggestions.set(key, {
			key,
			name,
			role,
			positions: [],
			unverified: true,
		});
	}
	return [...suggestions.values()];
}
