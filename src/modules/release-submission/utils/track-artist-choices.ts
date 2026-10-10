import type { ArtistLabels } from "./track-artist-links";

// What the user chose for one track artist: a linked artist token, leaving
// it unlinked, or following a release artist's label.
export type TrackArtistChoice =
	| { kind: "linked"; token: string }
	| { kind: "skipped" }
	| { kind: "following"; releaseName: string };

// Maps a track artist name to the user's choice for it.
export type TrackArtistChoices = Map<string, TrackArtistChoice>;

// Returns the starting choices: each track artist spelled exactly like a
// release artist follows that release artist.
export const getInitialTrackChoices = (
	names: string[],
	releaseNames: string[],
): TrackArtistChoices =>
	new Map(
		names
			.filter((name) => releaseNames.includes(name))
			.map((name) => [name, { kind: "following", releaseName: name }]),
	);

// Returns the choices with name's choice replaced, or removed when choice is
// undefined.
export const withChoice = <Choice>(
	choices: Map<string, Choice>,
	name: string,
	choice: Choice | undefined,
): Map<string, Choice> => {
	const nextChoices = new Map(choices);
	if (choice === undefined) {
		nextChoices.delete(name);
	} else {
		nextChoices.set(name, choice);
	}
	return nextChoices;
};

// Returns the label a choice resolves to, or undefined while it follows a
// release artist that hasn't been picked.
const resolveChoiceLabel = (
	name: string,
	choice: TrackArtistChoice,
	releaseLabels: ArtistLabels,
): string | undefined => {
	switch (choice.kind) {
		case "linked":
			return choice.token;
		case "skipped":
			return name;
		case "following":
			return releaseLabels.get(choice.releaseName);
	}
};

// Returns each track artist's label: its token when linked, its own name when
// skipped, or the followed release artist's label once that has one.
export const resolveTrackArtistLabels = (
	choices: TrackArtistChoices,
	releaseLabels: ArtistLabels,
): ArtistLabels => {
	const labels: ArtistLabels = new Map();
	for (const [name, choice] of choices) {
		const label = resolveChoiceLabel(name, choice, releaseLabels);
		if (label !== undefined) {
			labels.set(name, label);
		}
	}
	return labels;
};

// Returns the labels with each artist that follows an unpicked release
// artist labelled by its own name, as a skipped artist is.
export const withUnpickedFollowedNames = (
	choices: TrackArtistChoices,
	labels: ArtistLabels,
): ArtistLabels => {
	const filled: ArtistLabels = new Map(labels);
	for (const [name, choice] of choices) {
		if (choice.kind === "following" && !filled.has(name)) {
			filled.set(name, name);
		}
	}
	return filled;
};

// Returns the status text for a track artist's choice and resolved label.
export const describeTrackChoice = (
	choice: TrackArtistChoice | undefined,
	label: string | undefined,
): string => {
	if (choice === undefined) {
		return "not picked";
	}
	if (choice.kind === "skipped") {
		return "left unlinked";
	}
	if (choice.kind === "linked") {
		return choice.token;
	}
	if (label === undefined) {
		return `follows ${choice.releaseName} (not picked yet)`;
	}
	const followedLabel = label === choice.releaseName ? "unlinked" : label;
	return `follows ${choice.releaseName} (${followedLabel})`;
};
