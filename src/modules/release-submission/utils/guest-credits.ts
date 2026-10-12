import type { Track } from "~/shared/services/types";

export const GUEST_ROLE = "guest";
const CREDIT_TRACKS_SEPARATOR = ", ";

// A track artist who isn't a release artist, and the positions of the
// tracks they're on.
export type GuestArtist = {
	name: string;
	positions: string[];
};

// What the user chose for one guest: a credit line for a linked artist, a
// credit line with their name as plain text, or no credit.
export type GuestChoice =
	| { kind: "linked"; token: string; line: string | undefined }
	| { kind: "text"; line: string | undefined }
	| { kind: "skipped" };

// Returns each track artist who isn't a release artist, in order of first
// appearance, with the positions of the tracks they're on.
export const getGuestArtists = (
	tracks: Track[],
	releaseArtists: string[],
): GuestArtist[] => {
	const positionsByName = new Map<string, string[]>();
	for (const track of tracks) {
		const position = track.position?.trim();
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
	choice: GuestChoice | undefined,
): string => {
	const tracks = `tracks ${formatCreditTracks(guest.positions)}`;
	if (choice === undefined) {
		return `not credited (${tracks})`;
	}
	if (choice.kind === "skipped") {
		return `left out (${tracks})`;
	}
	const artist = choice.kind === "linked" ? choice.token : "plain text";
	return `${artist} as ${GUEST_ROLE} (${tracks})`;
};
