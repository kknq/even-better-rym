import { buildArtistToken } from "./artist-shortcuts";
import type { ArtistLabels } from "./track-artist-links";
import { hasSameMembers } from "./track-artist-links";

const ARTIST_TOKEN_ID_PATTERN = /^\[Artist(\d+)]$/;
const DIACRITIC_PATTERN = /\p{M}/gu;
const NON_ALPHANUMERIC_PATTERN = /[^\p{L}\p{N}]/gu;

// One artist in RYM's "filed under performer" list.
export type FiledUnderEntry = {
	id: string;
	name: string;
};

// What the user chose for one imported release artist.
export type ReleaseArtistChoice =
	| { kind: "linked"; entry: FiledUnderEntry }
	| { kind: "inherited"; entry: FiledUnderEntry }
	| { kind: "skipped" };

// Maps an imported release artist name to the user's choice for it.
export type ReleaseArtistChoices = Map<string, ReleaseArtistChoice>;

// Every imported release artist's name, and the labels of those picked so
// far.
export type ReleaseArtistLabels = {
	names: string[];
	labels: ArtistLabels;
};

// The release picker's choices and the row waiting for an artist to be
// picked in RYM's search, if any.
export type ReleasePickerState = {
	choices: ReleaseArtistChoices;
	activeName: string | undefined;
};

// The imported release artists and the entries the list held on import.
export type ReleasePickerArtists = {
	names: string[];
	parentEntries: FiledUnderEntry[];
};

// The entries RYM added to the filed-under list in one change, and the
// artist ids it lists afterwards.
export type FiledUnderListChange = {
	added: FiledUnderEntry[];
	presentIds: Set<string>;
};

// Filed-under entries to remove (by id) and to add.
export type FiledUnderChanges = {
	remove: string[];
	add: FiledUnderEntry[];
};

// Returns the artist id in an [ArtistNNNN] token, if it is one.
export const parseArtistTokenId = (token: string): string | undefined =>
	ARTIST_TOKEN_ID_PATTERN.exec(token.trim())?.[1];

// Returns the name with case, accents, punctuation and spacing removed, or
// just lowercased if that would leave nothing (e.g. "!!!").
export const normalizeArtistName = (name: string): string => {
	const lowercased = name.toLowerCase();
	const normalized = lowercased
		.normalize("NFD")
		.replace(DIACRITIC_PATTERN, "")
		.replace(NON_ALPHANUMERIC_PATTERN, "");
	return normalized.length > 0 ? normalized : lowercased;
};

// Pairs each imported name with the first unpaired parent entry whose name
// matches it once normalized, returning those names as inherited choices.
export const pairInheritedArtists = (
	names: string[],
	parentEntries: FiledUnderEntry[],
): ReleaseArtistChoices => {
	const choices: ReleaseArtistChoices = new Map();
	const unpaired = [...parentEntries];
	for (const name of names) {
		const key = normalizeArtistName(name);
		const index = unpaired.findIndex(
			(entry) => normalizeArtistName(entry.name) === key,
		);
		if (index === -1) {
			continue;
		}
		const [entry] = unpaired.splice(index, 1);
		choices.set(name, { kind: "inherited", entry });
	}
	return choices;
};

// Returns the linked and inherited entries in row order, each id once.
export const getChosenEntries = (
	names: string[],
	choices: ReleaseArtistChoices,
): FiledUnderEntry[] => {
	const entries = new Map<string, FiledUnderEntry>();
	for (const name of names) {
		const choice = choices.get(name);
		if (choice !== undefined && choice.kind !== "skipped") {
			entries.set(choice.entry.id, choice.entry);
		}
	}
	return [...entries.values()];
};

// Checks whether both lists hold the same artists, in any order.
export const hasSameEntries = (
	entries: FiledUnderEntry[],
	otherEntries: FiledUnderEntry[],
): boolean =>
	hasSameMembers(
		entries.map((entry) => entry.id),
		otherEntries.map((entry) => entry.id),
	);

// Returns the changes that make the filed-under list hold the chosen
// entries, removing only entries whose ids are in managedIds.
export const planFiledUnderChanges = (
	current: FiledUnderEntry[],
	chosen: { entries: FiledUnderEntry[]; managedIds: Set<string> },
): FiledUnderChanges => {
	const chosenIds = new Set(chosen.entries.map((entry) => entry.id));
	const currentIds = new Set(current.map((entry) => entry.id));
	return {
		remove: current
			.map((entry) => entry.id)
			.filter((id) => chosen.managedIds.has(id) && !chosenIds.has(id)),
		add: chosen.entries.filter((entry) => !currentIds.has(entry.id)),
	};
};

// Returns the current ids reordered so the chosen ones come first, in their
// chosen order, followed by the rest as they were.
export const orderFiledUnderIds = (
	currentIds: string[],
	chosenIds: string[],
): string[] => {
	const present = new Set(currentIds);
	const chosen = new Set(chosenIds);
	return [
		...chosenIds.filter((id) => present.has(id)),
		...currentIds.filter((id) => !chosen.has(id)),
	];
};

// Returns each chosen artist's tracklist label: its [ArtistNNNN] token when
// linked or inherited, or its plain name when skipped.
export const getReleaseArtistLabels = (
	choices: ReleaseArtistChoices,
): ArtistLabels => {
	const labels: ArtistLabels = new Map();
	for (const [name, choice] of choices) {
		labels.set(
			name,
			choice.kind === "skipped" ? name : buildArtistToken(choice.entry.id),
		);
	}
	return labels;
};

// Returns the choices without the linked or inherited ones whose artist is
// no longer listed, or the same choices if there are none.
export const clearRemovedChoices = (
	choices: ReleaseArtistChoices,
	presentIds: Set<string>,
): ReleaseArtistChoices => {
	const removedNames = [...choices]
		.filter(
			([, choice]) =>
				choice.kind !== "skipped" && !presentIds.has(choice.entry.id),
		)
		.map(([name]) => name);
	if (removedNames.length === 0) {
		return choices;
	}
	const remaining = new Map(choices);
	for (const name of removedNames) {
		remaining.delete(name);
	}
	return remaining;
};

// Checks whether any choice links or inherits the artist with the given id.
export const isChosenId = (
	choices: ReleaseArtistChoices,
	id: string,
): boolean =>
	[...choices.values()].some(
		(choice) => choice.kind !== "skipped" && choice.entry.id === id,
	);

// Returns the ids of the entries no choice links or inherits.
export const getUnchosenIds = (
	entries: FiledUnderEntry[],
	choices: ReleaseArtistChoices,
): string[] =>
	entries.map((entry) => entry.id).filter((id) => !isChosenId(choices, id));

// Returns the choice for an artist picked in RYM's search: inherited if it
// is one of the parent's entries, linked otherwise.
export const getPickedChoice = (
	entry: FiledUnderEntry,
	parentEntries: FiledUnderEntry[],
): ReleaseArtistChoice => {
	const parentEntry = parentEntries.find(
		(candidate) => candidate.id === entry.id,
	);
	return parentEntry === undefined
		? { kind: "linked", entry }
		: { kind: "inherited", entry: parentEntry };
};

// Returns the picker state after a change to the filed-under list. Rows
// whose artist was removed are cleared. The first added artist no other row
// has chosen goes to the active row, and the next unpicked row becomes
// active; an artist another row has chosen was added by the picker itself.
export const applyFiledUnderChange = (
	state: ReleasePickerState,
	change: FiledUnderListChange,
	artists: ReleasePickerArtists,
): ReleasePickerState => {
	const choices = clearRemovedChoices(state.choices, change.presentIds);
	const cleared = choices === state.choices ? state : { ...state, choices };
	const activeName = state.activeName;
	if (activeName === undefined) {
		return cleared;
	}
	const otherChoices = new Map(choices);
	otherChoices.delete(activeName);
	const picked = change.added.find(
		(entry) => !isChosenId(otherChoices, entry.id),
	);
	if (picked === undefined) {
		return cleared;
	}
	const nextChoices = new Map(choices).set(
		activeName,
		getPickedChoice(picked, artists.parentEntries),
	);
	return {
		choices: nextChoices,
		activeName: artists.names.find((name) => !nextChoices.has(name)),
	};
};

// Returns the indexes of ids that repeat an earlier one, ignoring missing
// ids.
export const getRepeatedIndexes = (ids: (string | undefined)[]): number[] => {
	const seen = new Set<string>();
	const repeated: number[] = [];
	ids.forEach((id, index) => {
		if (id === undefined) {
			return;
		}
		if (seen.has(id)) {
			repeated.push(index);
		} else {
			seen.add(id);
		}
	});
	return repeated;
};
