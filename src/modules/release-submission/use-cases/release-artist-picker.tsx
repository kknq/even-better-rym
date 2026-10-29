import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

import { waitForElement } from "~/shared/utils/dom";

import {
	clearFiledUnderSearch,
	createCreditedNameSync,
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
	getReleaseArtistCreditName,
	getReleaseArtistLabels,
	getUnchosenIds,
	hasSameEntries,
	pairInheritedArtists,
} from "../utils/release-artist-links";
import { reportSubmissionError } from "../utils/report-error";
import { withChoice } from "../utils/track-artist-choices";
import {
	getChoiceTone,
	InheritSelect,
	NOT_INHERITED,
	PickerButton,
	PickerPanel,
	PickerRow,
	SearchButton,
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
	const isIssue =
		document.querySelector("#filed_under_same_as_parent_no") !== null;
	const pageArtistId = /^\/releases\/ac\/?$/.test(window.location.pathname)
		? new URLSearchParams(window.location.search).get("artist_id")
		: null;
	const usePageArtist =
		names.length === 1 &&
		pageArtistId !== null &&
		/^[1-9]\d*$/.test(pageArtistId);
	const existingEntries =
		isIssue || usePageArtist ? readFiledUnderEntries() : [];
	const parentEntries = isIssue ? existingEntries : [];
	const initialChoices = pairInheritedArtists(names, parentEntries);
	if (usePageArtist) {
		const entry = existingEntries.find(
			(candidate) => candidate.id === pageArtistId,
		);
		if (entry !== undefined)
			initialChoices.set(names[0], { kind: "linked", entry });
	}
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
	const syncCreditedName = useRef(createCreditedNameSync());

	useEffect(() => {
		let active = true;
		const chosenEntries = getChosenEntries(session.names, choices);
		for (const entry of chosenEntries) {
			managedIds.current.add(entry.id);
		}
		if (!hasSameEntries(chosenEntries, session.parentEntries)) {
			switchAwayFromSameAsParent();
		}
		void syncFiledUnderEntries(chosenEntries, managedIds.current)
			.then(() => {
				if (active)
					syncCreditedName.current(
						getReleaseArtistCreditName(session.names, choices),
					);
			})
			.catch(reportSubmissionError);
		// The import listener already published the starting choices.
		if (choices !== session.initialChoices) {
			publishReleaseArtistLabels(session.names, choices);
		}
		return () => {
			active = false;
		};
	}, [session, choices]);

	useEffect(
		() => () => {
			syncCreditedName.current(undefined);
		},
		[],
	);

	useEffect(() => {
		// Assigns the selected search result to the active row.
		const handleListChange = (change: FiledUnderListChange) => {
			const previous = latest.current;
			const next = applyFiledUnderChange(previous, change, session);
			// An artist added by hand that no row chose stays the user's.
			for (const id of getUnchosenIds(change.added, next.choices)) {
				managedIds.current.delete(id);
			}
			if (change.added.length > 0) {
				void removeRepeatedFiledUnderEntries().catch(reportSubmissionError);
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
	return (
		<PickerPanel
			title="Release artists"
			hint="Choose the RYM artist each imported artist is filed under. For an alias, you can explicitly select a differently named parent artist."
		>
			{session.names.map((name) => {
				const matchingChoice = session.initialChoices.get(name);
				const matchingId =
					matchingChoice && matchingChoice.kind !== "skipped"
						? matchingChoice.entry.id
						: undefined;
				const aliasEntries = session.parentEntries.filter(
					(entry) => entry.id !== matchingId,
				);
				const choice = choices.get(name);
				return (
					<PickerRow
						key={name}
						name={name}
						status={describeChoice(choices.get(name))}
						tone={getChoiceTone(choices.get(name))}
						active={name === activeName}
					>
						<SearchButton
							active={name === activeName}
							hasLink={
								choices.get(name)?.kind === "linked" ||
								choices.get(name)?.kind === "inherited"
							}
							title="Search RYM for this artist, then click a result to file the release under them"
							onSearch={() => handleLink(name)}
							cancelTitle="Cancel artist selection and clear the search field"
							onCancel={() => {
								clearFiledUnderSearch();
								commit({ choices, activeName: undefined });
							}}
						/>
						<PickerButton
							value="Don't file under"
							title="Leave this artist out of Filed under"
							onClick={() => setChoice(name, { kind: "skipped" })}
						/>
						{session.initialChoices.has(name) && (
							<PickerButton
								value={
									matchingChoice?.kind === "linked"
										? "Use page artist"
										: "Use parent link"
								}
								title={
									matchingChoice?.kind === "linked"
										? "Restore the artist prefilled by this submission page"
										: "Restore this artist's matching link from the parent release"
								}
								disabled={
									choices.get(name) === session.initialChoices.get(name)
								}
								onClick={() =>
									setChoice(name, session.initialChoices.get(name))
								}
							/>
						)}
						{aliasEntries.length > 0 && (
							<InheritSelect
								placeholder="Use parent artist (alias)…"
								title="Explicitly map this imported name to a differently named artist from the parent release"
								inherited={
									choice?.kind === "inherited" && choice.entry.id !== matchingId
										? choice.entry.id
										: NOT_INHERITED
								}
								options={aliasEntries.map((entry) => ({
									value: entry.id,
									label: entry.name,
								}))}
								onSelect={(id) => {
									const entry = aliasEntries.find(
										(candidate) => candidate.id === id,
									);
									if (name === activeName) clearFiledUnderSearch();
									setChoice(
										name,
										entry === undefined
											? matchingChoice
											: { kind: "inherited", entry },
									);
								}}
							/>
						)}
					</PickerRow>
				);
			})}
		</PickerPanel>
	);
}

// Returns the status text for a release artist's choice.
function describeChoice(choice: ReleaseArtistChoice | undefined): string {
	if (choice === undefined) {
		return "not chosen yet";
	}
	if (choice.kind === "skipped") {
		return "not filed under";
	}
	const source = choice.kind === "linked" ? "" : " (from parent)";
	return `filed under ${choice.entry.name}${source}`;
}
