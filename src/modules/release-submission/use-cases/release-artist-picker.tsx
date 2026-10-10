import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

import { waitForElement } from "~/shared/utils/dom";

import {
	readFiledUnderEntries,
	removeRepeatedFiledUnderEntries,
	searchFiledUnder,
	switchAwayFromSameAsParent,
	syncFiledUnderEntries,
	watchFiledUnderChanges,
} from "../utils/filed-under";
import type {
	FiledUnderListChange,
	ReleaseArtistChoice,
	ReleaseArtistChoices,
	ReleaseArtistLabels,
	ReleasePickerArtists,
	ReleasePickerState,
} from "../utils/release-artist-links";
import {
	applyFiledUnderChange,
	getChosenEntries,
	getReleaseArtistLabels,
	getUnchosenIds,
	hasSameEntries,
	pairInheritedArtists,
} from "../utils/release-artist-links";
import { withChoice } from "../utils/track-artist-choices";
import {
	InheritSelect,
	NOT_INHERITED,
	PickerButton,
	PickerRow,
} from "./picker-row";
import { useLatestState } from "./use-latest-state";

type ReleasePickerSession = ReleasePickerArtists & {
	initialChoices: ReleaseArtistChoices;
};

type ReleasePickerImport = {
	count: number;
	session: ReleasePickerSession | undefined;
};

export default async function injectReleaseArtistPicker() {
	// Placed before the section, which RYM hides while an issue is "credited
	// in the same manner as the parent issue".
	const section = await waitForElement("#section_filed_under");
	const container = document.createElement("div");
	section.before(container);
	render(<ReleaseArtistPicker />, container);
}

// Tells the tracklist picker the release artists and their current labels.
function publishReleaseArtistLabels(
	names: string[],
	choices: ReleaseArtistChoices,
): void {
	document.dispatchEvent(
		new CustomEvent<ReleaseArtistLabels>("releaseArtistLabelsEvent", {
			detail: { names, labels: getReleaseArtistLabels(choices) },
		}),
	);
}

// Returns the picker session for the imported release artists, or undefined
// if there are none to pick.
function getReleasePickerSession(
	names: string[],
): ReleasePickerSession | undefined {
	if (names.length === 0) {
		return undefined;
	}
	const parentEntries = readFiledUnderEntries();
	const initialChoices = pairInheritedArtists(names, parentEntries);
	return { names, parentEntries, initialChoices };
}

// Tracks the picker session started by the most recent import, numbered so
// each import gets a fresh panel. Publishes the session's starting labels
// straight away, so the tracklist picker never sees the previous import's.
function useReleasePickerImport(): ReleasePickerImport {
	const [pickerImport, setPickerImport] = useState<ReleasePickerImport>({
		count: 0,
		session: undefined,
	});

	useEffect(() => {
		const listener = (event: CustomEvent<string[]>) => {
			const session = getReleasePickerSession(event.detail);
			publishReleaseArtistLabels(
				session?.names ?? [],
				session?.initialChoices ?? new Map<string, ReleaseArtistChoice>(),
			);
			setPickerImport((previous) => ({
				count: previous.count + 1,
				session,
			}));
		};
		document.addEventListener("releaseArtistsEvent", listener);
		return () => document.removeEventListener("releaseArtistsEvent", listener);
	}, []);

	return pickerImport;
}

function ReleaseArtistPicker() {
	const { count, session } = useReleasePickerImport();
	if (session === undefined) {
		return null;
	}
	return <ReleasePickerPanel key={count} session={session} />;
}

function ReleasePickerPanel({
	session,
}: Readonly<{ session: ReleasePickerSession }>) {
	// The latest state is read by the filed-under watcher, which outlives
	// renders.
	const { state, latest, commit } = useLatestState<ReleasePickerState>(() => ({
		choices: session.initialChoices,
		activeName: undefined,
	}));
	const { choices, activeName } = state;
	// Ids of the entries this picker may remove: the parent's and any chosen,
	// less any the user added back by hand.
	const managedIds = useRef(
		new Set(session.parentEntries.map((entry) => entry.id)),
	);

	useEffect(() => {
		const chosenEntries = getChosenEntries(session.names, choices);
		for (const entry of chosenEntries) {
			managedIds.current.add(entry.id);
		}
		if (!hasSameEntries(chosenEntries, session.parentEntries)) {
			switchAwayFromSameAsParent();
		}
		void syncFiledUnderEntries(chosenEntries, managedIds.current);
		// The import listener already published the starting choices.
		if (choices !== session.initialChoices) {
			publishReleaseArtistLabels(session.names, choices);
		}
	}, [session, choices]);

	useEffect(() => {
		// Applies a change to the filed-under list and searches for the next
		// row's artist.
		const handleListChange = (change: FiledUnderListChange) => {
			const previous = latest.current;
			const next = applyFiledUnderChange(previous, change, session);
			// An artist added by hand that no row chose stays the user's.
			for (const id of getUnchosenIds(change.added, next.choices)) {
				managedIds.current.delete(id);
			}
			if (change.added.length > 0) {
				void removeRepeatedFiledUnderEntries();
			}
			if (
				next.activeName !== undefined &&
				next.activeName !== previous.activeName
			) {
				searchFiledUnder(next.activeName);
			}
			commit(next);
		};
		return watchFiledUnderChanges(handleListChange);
	}, [session, latest, commit]);

	const setChoice = (name: string, choice: ReleaseArtistChoice | undefined) =>
		commit({
			choices: withChoice(choices, name, choice),
			activeName: name === activeName ? undefined : activeName,
		});
	const handleLink = (name: string) => {
		commit({ choices, activeName: name });
		searchFiledUnder(name);
	};
	const handleInherit = (name: string, id: string) => {
		const entry = session.parentEntries.find(
			(candidate) => candidate.id === id,
		);
		setChoice(
			name,
			entry === undefined ? undefined : { kind: "inherited", entry },
		);
	};

	return (
		<div style={{ marginTop: "1em" }}>
			<b>Release artist links</b>
			{session.names.map((name) => (
				<PickerRow
					key={name}
					name={name}
					status={describeChoice(choices.get(name))}
					active={name === activeName}
				>
					<PickerButton value="Link" onClick={() => handleLink(name)} />
					<PickerButton
						value="Skip"
						onClick={() => setChoice(name, { kind: "skipped" })}
					/>
					{session.parentEntries.length > 0 && (
						<InheritSelect
							inherited={getInheritedId(choices.get(name))}
							options={session.parentEntries.map((entry) => ({
								value: entry.id,
								label: entry.name,
							}))}
							onSelect={(id) => handleInherit(name, id)}
						/>
					)}
				</PickerRow>
			))}
		</div>
	);
}

// Returns the status text for a release artist's choice.
function describeChoice(choice: ReleaseArtistChoice | undefined): string {
	if (choice === undefined) {
		return "not picked";
	}
	if (choice.kind === "skipped") {
		return "left unlinked";
	}
	const verb =
		choice.kind === "linked" ? "linked to" : "inherited from parent:";
	return `${verb} ${choice.entry.name}`;
}

// Returns the id of the parent artist a choice inherits, if any.
function getInheritedId(choice: ReleaseArtistChoice | undefined): string {
	return choice?.kind === "inherited" ? choice.entry.id : NOT_INHERITED;
}
