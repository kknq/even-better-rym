import type { Track } from "~/shared/services/types";
import type { CreditChoice } from "./credit-lines";
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
// appearance, with the positions of the tracks they're on.
export const getGuestArtists = (
	tracks: Track[],
	releaseArtists: string[],
): GuestArtist[] => {
	const positionsByName = new Map<string, string[]>();
	for (const [index, track] of tracks.entries()) {
		if (track.header) continue;
		const position = getTrackPosition(track, index);
		const guests = (track.artists ?? []).filter(
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
export const formatCreditTracks = (positions: string[]): string =>
	positions.join(CREDIT_TRACKS_SEPARATOR);

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
