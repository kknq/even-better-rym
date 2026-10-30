import type { Track } from "~/shared/services/types";
import type { CreditChoice } from "./credit-lines";
import { getNonFeaturedTrackArtists } from "./suggested-credits";
import { getTrackPosition } from "./track-position";

export const GUEST_ROLE = "guest";
const CREDIT_TRACKS_SEPARATOR = ", ";

// A track artist who isn't a release artist, and the positions of the
// tracks they're on.
export type GuestArtist = {
	name: string;
	positions: string[];
};

// Returns each track artist who isn't a release artist, in order of first
// appearance, excluding their featured appearances on the same tracks.
export const getGuestArtists = (
	tracks: Track[],
	releaseArtists: string[],
): GuestArtist[] => {
	const positionsByName = new Map<string, string[]>();
	for (const [index, track] of tracks.entries()) {
		if (track.header) continue;
		const position = getTrackPosition(track, index);
		const guests = getNonFeaturedTrackArtists(track).filter(
			(name) => !releaseArtists.includes(name),
		);
		for (const name of guests) {
			const positions = positionsByName.get(name) ?? [];
			if (position !== undefined && !positions.includes(position)) {
				positions.push(position);
			}
			positionsByName.set(name, positions);
		}
	}
	return [...positionsByName].map(([name, positions]) => ({
		name,
		positions,
	}));
};

// Returns the positions as RYM's credit tracks field lists them.
export const formatCreditTracks = (positions: string[]): string => {
	const runs: string[][] = [];
	let run: string[] = [];
	let previous = Number.NaN;
	let previousPrefix: string | undefined;
	for (const position of positions) {
		const match = /^([A-Za-z]?)([1-9]\d*)$/.exec(position);
		const prefix = match?.[1];
		const number = match ? Number(match[2]) : Number.NaN;
		if (
			!Number.isSafeInteger(number) ||
			prefix !== previousPrefix ||
			number !== previous + 1
		) {
			run = [];
			runs.push(run);
		}
		run.push(position);
		previous = Number.isSafeInteger(number) ? number : Number.NaN;
		previousPrefix = prefix;
	}
	return runs
		.map((positions) => {
			const first = positions[0];
			const last = positions.at(-1);
			return positions.length >= 3 && first !== undefined && last !== undefined
				? `${first}-${last}`
				: positions.join(CREDIT_TRACKS_SEPARATOR);
		})
		.join(CREDIT_TRACKS_SEPARATOR);
};

// Returns the status text for a guest's choice.
export const describeGuestChoice = (
	guest: GuestArtist,
	choice: CreditChoice | undefined,
): string => {
	const tracks = `tracks ${formatCreditTracks(guest.positions)}`;
	if (choice === undefined) {
		return `not chosen yet (${tracks})`;
	}
	if (choice.kind === "skipped") {
		return `not credited (${tracks})`;
	}
	return choice.kind === "linked"
		? `${choice.token} as ${GUEST_ROLE} (${tracks})`
		: `credited by name (${tracks})`;
};
