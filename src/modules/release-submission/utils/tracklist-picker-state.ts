import type { Track } from "~/shared/services/types";

import type { EditHistory } from "./edit-history";
import { recordEdit, replaceCurrent } from "./edit-history";
import type { TrackArtistChoices } from "./track-artist-choices";
import {
	resolveTrackArtistLabels,
	withUnpickedFollowedNames,
} from "./track-artist-choices";
import type {
	ArtistLabels,
	RelinkPlan,
	TrackKey,
	TrackTether,
} from "./track-artist-links";
import {
	applyTrackTitles,
	buildRelinkPlan,
	resetTrackTitle,
	tetherTrackTitles,
} from "./track-artist-links";

// The imported tracks and their distinct artists, in order.
export type PickerSession = {
	tracks: Track[];
	names: string[];
};

// One undo step: the tracklist text, the user's choices, which tracks the
// picker still controls, and the labels it last applied.
export type TracklistPickerState = {
	text: string;
	choices: TrackArtistChoices;
	tether: TrackTether;
	appliedPlan: RelinkPlan;
};

export type PickerHistory = EditHistory<TracklistPickerState>;

// Returns the state before the picker has written anything, with each
// track's imported title as the base it resets to.
export const createPickerState = (
	text: string,
	choices: TrackArtistChoices,
): TracklistPickerState => ({
	text,
	choices,
	tether: tetherTrackTitles(text),
	appliedPlan: new Map(),
});

// Returns the labels the picker writes. Once it has written the tracklist,
// an artist following an unpicked release artist is written by name, so
// removing a release pick drops that artist's links.
export const getWrittenLabels = (
	state: TracklistPickerState,
	releaseLabels: ArtistLabels,
): ArtistLabels => {
	const labels = resolveTrackArtistLabels(state.choices, releaseLabels);
	return state.appliedPlan.size === 0
		? labels
		: withUnpickedFollowedNames(state.choices, labels);
};

// Checks whether the labels give every artist one.
const hasAllLabels = (names: string[], labels: ArtistLabels): boolean =>
	names.every((name) => labels.has(name));

// Checks whether the choices give every artist a label to write.
export const canApplyChoices = (
	state: TracklistPickerState,
	session: PickerSession,
	releaseLabels: ArtistLabels,
): boolean =>
	hasAllLabels(session.names, getWrittenLabels(state, releaseLabels));

// Returns the state with the choices' labels written to the tracks the
// picker still controls, once every artist has a label.
export const applyChoices = (
	state: TracklistPickerState,
	session: PickerSession,
	releaseLabels: ArtistLabels,
): TracklistPickerState => {
	const labels = getWrittenLabels(state, releaseLabels);
	if (!hasAllLabels(session.names, labels)) {
		return state;
	}
	const plan = buildRelinkPlan(session.tracks, labels);
	return {
		...state,
		...applyTrackTitles(state.text, plan, state.tether),
		appliedPlan: plan,
	};
};

// Returns the state with the track given the picker's last applied title
// again.
export const resetTrack = (
	state: TracklistPickerState,
	key: TrackKey,
): TracklistPickerState => ({
	...state,
	...resetTrackTitle(state, state.appliedPlan, key),
});

// Returns a map's entries as text that is the same for equal maps.
const serializeMap = <T>(map: Map<string, T>): string =>
	JSON.stringify([...map].sort(([a], [b]) => a.localeCompare(b)));

// Checks whether two states hold the same text, choices and tether.
export const isSamePickerState = (
	state: TracklistPickerState,
	otherState: TracklistPickerState,
): boolean =>
	state.text === otherState.text &&
	serializeMap(state.choices) === serializeMap(otherState.choices) &&
	serializeMap(state.tether) === serializeMap(otherState.tether);

// Returns the history with next recorded as an undo step, unless it holds
// the same state as the current one.
export const recordUserChange = (
	history: PickerHistory,
	next: TracklistPickerState,
): PickerHistory =>
	isSamePickerState(next, history.current)
		? history
		: recordEdit(history, next);

// Returns the history with the release labels applied to its current state
// without adding an undo step, so automatic updates are never undoable and
// survive restoring an older step.
export const reapplyReleaseLabels = (
	history: PickerHistory,
	session: PickerSession,
	releaseLabels: ArtistLabels,
): PickerHistory =>
	replaceCurrent(
		history,
		applyChoices(history.current, session, releaseLabels),
	);
