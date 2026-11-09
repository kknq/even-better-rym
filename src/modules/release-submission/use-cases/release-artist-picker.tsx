import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

import { waitForElement } from "~/shared/utils/dom";

import {
	clearFiledUnderSearch,
	createCreditedNameSuggestion,
	readFiledUnderEntries,
	removeRepeatedFiledUnderEntries,
	searchFiledUnder,
	switchAwayFromSameAsParent,
	syncFiledUnderEntries,
	watchFiledUnderChanges,
} from "../utils/filed-under";
import { showInlineNotice } from "../utils/inline-notice";
import type {
	FiledUnderEntry,
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
	// Entries already in Filed under when the import started, which are only
	// removed once the user accepts replacing them.
	existingEntries: FiledUnderEntry[];
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
			detail: {
				names,
				labels: getReleaseArtistLabels(choices),
				artistNames: new Map(
					[...choices].flatMap(([name, choice]) =>
						choice.kind === "skipped"
							? []
							: [[name, choice.entry.name] as const],
					),
				),
			},
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
	const existingEntries = readFiledUnderEntries();
	const parentEntries = isIssue ? existingEntries : [];
	const initialChoices = pairInheritedArtists(names, parentEntries);
	if (usePageArtist) {
		const entry = existingEntries.find(
			(candidate) => candidate.id === pageArtistId,
		);
		if (entry !== undefined)
			initialChoices.set(names[0], { kind: "linked", entry });
	}
	return { names, parentEntries, initialChoices, existingEntries };
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
	// Ids of the entries this picker may remove: any it chose, less any the
	// user added back by hand. Entries listed before the import are only added
	// once the user accepts replacing them.
	const managedIds = useRef(new Set<string>());
	// The entries listed before the import that are still listed and haven't
	// been replaced.
	const [keptEntries, setKeptEntries] = useState(session.existingEntries);
	const syncCreditedName = useRef(createCreditedNameSuggestion());
	const replaceableEntries = getReplaceableEntries(
		keptEntries,
		getChosenEntries(session.names, choices),
	);
	const undecidedNames = session.names.filter((name) => !choices.has(name));
	const noticeKey = [
		...[keptEntries, replaceableEntries].map((entries) =>
			entries.map((entry) => `${entry.id}:${entry.name}`).join("|"),
		),
		undecidedNames.join("|"),
	].join("/");

	useEffect(() => {
		let active = true;
		const chosenEntries = getChosenEntries(session.names, choices);
		const keptIds = new Set(keptEntries.map((entry) => entry.id));
		for (const entry of chosenEntries) {
			if (!keptIds.has(entry.id)) managedIds.current.add(entry.id);
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
	}, [session, choices, keptEntries]);

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
			setKeptEntries((kept) => {
				const present = kept.filter((entry) => change.presentIds.has(entry.id));
				return present.length === kept.length ? kept : present;
			});
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
	useEffect(() => {
		if (replaceableEntries.length === 0) return undefined;
		return showReplaceExistingNotice(keptEntries, replaceableEntries, () => {
			if (undecidedNames.length > 0)
				return getUndecidedArtistsError(undecidedNames);
			for (const entry of replaceableEntries) managedIds.current.add(entry.id);
			setKeptEntries([]);
			return undefined;
		});
	}, [noticeKey]);
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

// Returns the entries listed before the import that no row has chosen, which
// can be replaced once at least one imported artist is chosen.
function getReplaceableEntries(
	keptEntries: FiledUnderEntry[],
	chosenEntries: FiledUnderEntry[],
): FiledUnderEntry[] {
	if (chosenEntries.length === 0) return [];
	const chosenIds = new Set(chosenEntries.map((entry) => entry.id));
	return keptEntries.filter((entry) => !chosenIds.has(entry.id));
}

const formatList = (names: string[], type: "conjunction" | "disjunction") =>
	new Intl.ListFormat("en", { type }).format(names);

const formatNames = (entries: FiledUnderEntry[]): string =>
	formatList(
		entries.map((entry) => entry.name),
		"conjunction",
	);

const getUndecidedArtistsError = (names: string[]): string =>
	`Before overwriting, decide on ${formatList(names, "conjunction")} in Release artists: link ${names.length === 1 ? "it" : "each"} to a RYM artist or click "Don't file under".`;

// Shows a light red notice in File under performer listing every artist
// filed under before the import, offering to remove those the import didn't
// choose.
function showReplaceExistingNotice(
	existingEntries: FiledUnderEntry[],
	replaceableEntries: FiledUnderEntry[],
	onReplace: () => string | undefined,
): () => void {
	return showInlineNotice({
		className: "ebr-replace-filed-under-notice",
		message: `Already filed under ${formatNames(existingEntries)}.`,
		action: {
			value: "Overwrite with performers from the import",
			title: `Remove ${formatNames(replaceableEntries)} from File under performer, keeping the chosen imported artists`,
			onClick: onReplace,
		},
		// Matches the Release artists panel's 1em margin above.
		margin: "1em 0",
		place: (notice) =>
			document.querySelector("#section_filed_under")?.prepend(notice),
	});
}
