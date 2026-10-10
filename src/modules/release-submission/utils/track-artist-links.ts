import type { Track } from "~/shared/services/types";
import { arrayToArtists } from "~/shared/utils/string";

import { ARTIST_SEPARATOR } from "./artist-shortcuts";

export const TRACKLIST_LINE_SEPARATOR = "\n";
export const TRACKLIST_FIELD_SEPARATOR = "|";

// Maps an artist name to the label written for it: an [ArtistNNNN] token,
// or the plain name when the user skipped it.
export type ArtistLabels = Map<string, string>;

// Identifies a track by its position and which occurrence of that position
// it is, so repeated positions stay apart.
export type TrackKey = string;

// Maps a track to the artist labels to prefix onto its title.
export type RelinkPlan = Map<TrackKey, string[]>;

// A track's title before the picker first prefixed it, and the title the
// picker last wrote to it.
export type TrackTitles = {
	base: string;
	written: string;
};

// Maps each track the picker has written to its titles. A track whose title
// no longer matches the written one has been edited by hand.
export type TrackTether = Map<TrackKey, TrackTitles>;

export type AppliedTitles = {
	text: string;
	tether: TrackTether;
};

// Returns the title prefixed with its artist labels, joined RYM-style.
export const buildLinkedTitle = (title: string, labels: string[]): string =>
	`${arrayToArtists([...labels])}${ARTIST_SEPARATOR}${title}`;

// Returns the tracks with the release's artists filled in on any track that
// lists none of its own.
export const withReleaseArtistFallback = (
	tracks: Track[],
	releaseArtists: string[],
): Track[] =>
	tracks.map((track) =>
		track.artists === undefined || track.artists.length === 0
			? { ...track, artists: releaseArtists }
			: track,
	);

// Checks whether both collections hold the same members, in any order.
export const hasSameMembers = <T>(
	items: Iterable<T>,
	otherItems: Iterable<T>,
): boolean => {
	const members = new Set(items);
	const otherMembers = new Set(otherItems);
	return (
		members.size === otherMembers.size &&
		[...members].every((member) => otherMembers.has(member))
	);
};

// Checks whether any track lists artists other than exactly the release's.
// A track with no artists of its own counts as the release's.
export const hasDifferingTrackArtists = (
	tracks: Track[],
	releaseArtists: string[],
): boolean =>
	tracks.some(
		(track) =>
			track.artists !== undefined &&
			track.artists.length > 0 &&
			!hasSameMembers(track.artists, releaseArtists),
	);

// Returns each track artist name once, in order of first appearance.
export const getDistinctTrackArtists = (tracks: Track[]): string[] => [
	...new Set(tracks.flatMap((track) => track.artists ?? [])),
];

// Returns each position's track key, numbering repeats of a position, or
// undefined where there is no position.
export const getTrackKeys = (
	positions: (string | undefined)[],
): (TrackKey | undefined)[] => {
	const occurrences = new Map<string, number>();
	return positions.map((position) => {
		if (position === undefined) {
			return undefined;
		}
		const occurrence = (occurrences.get(position) ?? 0) + 1;
		occurrences.set(position, occurrence);
		return `${position}#${occurrence}`;
	});
};

// Builds each track's labels entry from the artists' labels.
export const buildRelinkPlan = (
	tracks: Track[],
	labels: ArtistLabels,
): RelinkPlan => {
	const keys = getTrackKeys(tracks.map((track) => track.position?.trim()));
	const plan: RelinkPlan = new Map();
	tracks.forEach((track, index) => {
		const key = keys[index];
		if (key === undefined || track.artists === undefined) {
			return;
		}
		plan.set(
			key,
			track.artists.map((name) => labels.get(name) ?? name),
		);
	});
	return plan;
};

// Returns the tracklist text split into lines of fields.
const splitTracklist = (text: string): string[][] =>
	text
		.split(TRACKLIST_LINE_SEPARATOR)
		.map((line) => line.split(TRACKLIST_FIELD_SEPARATOR));

// Returns a line's trimmed position, or undefined if the line isn't a track,
// which RYM only reads from lines with a title field.
const getLinePosition = (fields: string[]): string | undefined =>
	fields.length < 2 ? undefined : fields[0].trim();

// Returns each tracklist line's track key, or undefined for non-track lines.
const getLineKeys = (lines: string[][]): (TrackKey | undefined)[] =>
	getTrackKeys(lines.map(getLinePosition));

// Returns each track's trimmed title in the tracklist text.
export const readTrackTitles = (text: string): Map<TrackKey, string> => {
	const lines = splitTracklist(text);
	const keys = getLineKeys(lines);
	const titles = new Map<TrackKey, string>();
	lines.forEach((fields, index) => {
		const key = keys[index];
		if (key !== undefined) {
			titles.set(key, fields[1].trim());
		}
	});
	return titles;
};

// Returns the tracklist text with the given tracks' titles replaced.
export const writeTrackTitles = (
	text: string,
	titles: Map<TrackKey, string>,
): string => {
	const lines = splitTracklist(text);
	const keys = getLineKeys(lines);
	return lines
		.map((fields, index) => {
			const key = keys[index];
			const title = key === undefined ? undefined : titles.get(key);
			if (title === undefined) {
				return fields.join(TRACKLIST_FIELD_SEPARATOR);
			}
			return [fields[0], title, ...fields.slice(2)].join(
				TRACKLIST_FIELD_SEPARATOR,
			);
		})
		.join(TRACKLIST_LINE_SEPARATOR);
};

// Returns the titles that differ between two tracklists, or undefined if
// anything besides titles differs.
export const getChangedTitles = (
	fromText: string,
	toText: string,
): Map<TrackKey, string> | undefined => {
	const toTitles = readTrackTitles(toText);
	const changed = new Map<TrackKey, string>();
	for (const [key, title] of readTrackTitles(fromText)) {
		const toTitle = toTitles.get(key);
		if (toTitle !== undefined && toTitle !== title) {
			changed.set(key, toTitle);
		}
	}
	return writeTrackTitles(fromText, changed) === toText ? changed : undefined;
};

// Returns a tether holding each track's current title as both its base and
// its written title, so the picker controls every track until it is edited.
export const tetherTrackTitles = (text: string): TrackTether =>
	new Map(
		[...readTrackTitles(text)].map(([key, title]) => [
			key,
			{ base: title, written: title },
		]),
	);

// Returns the title the picker writes for a track: its base title prefixed
// with its artist labels.
const buildWrittenTitle = (base: string, labels: string[]): string =>
	buildLinkedTitle(base, labels).trim();

// Returns the tracklist with each planned track that still holds the
// picker's last title prefixed with its labels. A track the picker hasn't
// written yet keeps its current title as its base.
export const applyTrackTitles = (
	text: string,
	plan: RelinkPlan,
	tether: TrackTether,
): AppliedTitles => {
	const titles = readTrackTitles(text);
	const nextTether: TrackTether = new Map(tether);
	const nextTitles = new Map<TrackKey, string>();
	for (const [key, labels] of plan) {
		const title = titles.get(key);
		const entry = tether.get(key);
		if (
			title === undefined ||
			(entry !== undefined && entry.written !== title)
		) {
			continue;
		}
		const base = entry?.base ?? title;
		const written = buildWrittenTitle(base, labels);
		nextTether.set(key, { base, written });
		nextTitles.set(key, written);
	}
	return { text: writeTrackTitles(text, nextTitles), tether: nextTether };
};

// Returns the tracks whose titles were edited after the picker wrote them.
export const getUntetheredKeys = (
	text: string,
	tether: TrackTether,
): TrackKey[] =>
	[...readTrackTitles(text)]
		.filter(([key, title]) => {
			const written = tether.get(key)?.written;
			return written !== undefined && written !== title;
		})
		.map(([key]) => key);

// Returns the tracklist with the track's title put back to its base title
// prefixed with its planned labels, which ties it to the picker again.
export const resetTrackTitle = (
	applied: AppliedTitles,
	plan: RelinkPlan,
	key: TrackKey,
): AppliedTitles => {
	const base = applied.tether.get(key)?.base;
	const labels = plan.get(key);
	if (base === undefined || labels === undefined) {
		return applied;
	}
	const written = buildWrittenTitle(base, labels);
	return {
		text: writeTrackTitles(applied.text, new Map([[key, written]])),
		tether: new Map(applied.tether).set(key, { base, written }),
	};
};
