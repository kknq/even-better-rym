import { Fragment, render } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useState } from "preact/hooks";

import type { ResolveData } from "~/shared/services/types";
import { waitForElement } from "~/shared/utils/dom";

import { buildArtistToken } from "../utils/artist-shortcuts";
import { closeShortcutPopup } from "../utils/page-functions";
import type { ReleaseArtistLabels } from "../utils/release-artist-links";
import { parseArtistTokenId } from "../utils/release-artist-links";
import { reportSubmissionError } from "../utils/report-error";
import {
	startArtistSearch,
	watchArtistResultClicks,
} from "../utils/shortcut-popup";
import {
	ensureResetSlots,
	watchTracklistRows,
} from "../utils/simple-tracklist";
import { getNonFeaturedTrackArtists } from "../utils/suggested-credits";
import type {
	TrackArtistChoice,
	TrackArtistChoices,
} from "../utils/track-artist-choices";
import {
	describeTrackChoice,
	resolveTrackArtistLabels,
	withChoice,
} from "../utils/track-artist-choices";
import type { TrackKey } from "../utils/track-artist-links";
import {
	getDistinctTrackArtists,
	getUntetheredKeys,
	hasDifferingTrackArtists,
	prefixesTrackArtists,
	withReleaseArtistFallback,
} from "../utils/track-artist-links";
import type { PickerSession } from "../utils/tracklist-picker-state";
import { resetTrack } from "../utils/tracklist-picker-state";
import type { ReleaseOptions } from "../utils/types";
import { rememberArtistAssociation } from "./artist-associations";
import {
	getChoiceTone,
	InheritSelect,
	NOT_INHERITED,
	PickerButton,
	PickerPanel,
	PickerRow,
	SearchButton,
} from "./picker-row";
import { useTracklistHistory } from "./tracklist-history";
import { useImportTracks } from "./use-import-tracks";

const PICKER_ID = "ebr-artist-link-picker";
const NO_RELEASE_ARTISTS: ReleaseArtistLabels = {
	names: [],
	labels: new Map(),
};

export default async function injectArtistLinkPicker() {
	const tracklist = await waitForElement("#tracks_adv");
	const container = document.createElement("div");
	tracklist.after(container);
	render(<ArtistLinkPicker />, container);
}

type TrackPickerSession = PickerSession & { automatic: boolean };

// Keeps the imported tracks available for explicit release-artist requests,
// even on releases that do not normally need artist prefixes.
function getPickerSession(
	data: ResolveData,
	options: ReleaseOptions,
): TrackPickerSession | undefined {
	if (!options.fillFields.tracks) return undefined;
	const releaseArtists = data.artists ?? [];
	const tracks = withReleaseArtistFallback(
		data.tracks ?? [],
		releaseArtists,
	).map((track) => ({
		...track,
		artists: getNonFeaturedTrackArtists(track),
	}));
	const automatic =
		prefixesTrackArtists(tracks, releaseArtists) &&
		hasDifferingTrackArtists(tracks, releaseArtists);
	const names = getDistinctTrackArtists(tracks);
	if (names.length === 0) {
		return undefined;
	}
	return { tracks, names, automatic };
}

// Tracks the release artists and labels the release-artist picker most
// recently published.
function useReleaseArtistLabels(): ReleaseArtistLabels {
	const [release, setRelease] =
		useState<ReleaseArtistLabels>(NO_RELEASE_ARTISTS);

	useEffect(() => {
		const listener = (event: CustomEvent<ReleaseArtistLabels>) =>
			setRelease(event.detail);
		document.addEventListener("releaseArtistLabelsEvent", listener);
		return () =>
			document.removeEventListener("releaseArtistLabelsEvent", listener);
	}, []);

	return release;
}

// Tracks each tracklist row's reset slot, re-adding the slots whenever RYM
// rebuilds the rows.
function useResetSlots(): Map<TrackKey, HTMLElement> {
	const [slots, setSlots] = useState(ensureResetSlots);

	useEffect(() => watchTracklistRows(() => setSlots(ensureResetSlots())), []);

	return slots;
}

function ArtistLinkPicker() {
	const { count, session: imported } = useImportTracks();
	const release = useReleaseArtistLabels();
	if (!imported?.options.fillFields.tracks) return null;
	if (imported.loading) {
		return (
			<PickerPanel
				id={PICKER_ID}
				title="Track artists"
				hint="Checking song credits before suggesting artists for track titles."
				footer={
					<div role="status">
						Loading song credits ({imported.progress.completed}/
						{imported.progress.total})...
					</div>
				}
				children={null}
			/>
		);
	}
	const session = getPickerSession(
		{ ...imported.data, tracks: imported.tracks },
		imported.options,
	);
	if (session === undefined) {
		return imported.error ? <div role="alert">{imported.error}</div> : null;
	}
	return (
		<TrackPickerPanel
			key={count}
			session={session}
			release={release}
			error={imported.error}
		/>
	);
}

type TrackPickerPanelProps = {
	session: TrackPickerSession;
	release: ReleaseArtistLabels;
	error?: string;
};

function TrackPickerPanel({
	session,
	release,
	error,
}: Readonly<TrackPickerPanelProps>) {
	const [activeName, setActiveName] = useState<string | undefined>();
	const [unlinkedName, setUnlinkedName] = useState<string | undefined>();
	const tracklist = useTracklistHistory(
		session,
		release,
		session.automatic
			? undefined
			: new Map(session.names.map((name) => [name, { kind: "skipped" }])),
	);
	const resetSlots = useResetSlots();
	const { choices } = tracklist.state;
	const labels = resolveTrackArtistLabels(choices, release.labels);
	const { editState } = tracklist;

	useEffect(() => {
		if (activeName === undefined) {
			return undefined;
		}
		return watchArtistResultClicks(
			(assocId) => {
				rememberArtistAssociation(activeName, assocId);
				const releaseLabel = release.labels.get(activeName);
				const nextChoices = withChoice(choices, activeName, {
					kind: "linked",
					token:
						releaseLabel !== undefined &&
						parseArtistTokenId(releaseLabel) === assocId
							? releaseLabel
							: buildArtistToken(assocId),
				});
				editState((state) => ({ ...state, choices: nextChoices }));
				setActiveName(undefined);
				void closeShortcutPopup().catch(reportSubmissionError);
			},
			PICKER_ID,
			() => setActiveName(undefined),
		);
	}, [session, release, choices, activeName, editState]);

	const setChoice = (
		name: string,
		choice: TrackArtistChoice | undefined,
		allowUnpicked = false,
	) => {
		setUnlinkedName((previous) => (previous === name ? undefined : previous));
		editState(
			(state) => ({
				...state,
				choices: withChoice(state.choices, name, choice),
			}),
			allowUnpicked,
		);
		if (name === activeName) {
			setActiveName(undefined);
			void closeShortcutPopup().catch(reportSubmissionError);
		}
	};
	const handleLink = (name: string) => {
		setActiveName(name);
		void startArtistSearch(PICKER_ID, name).catch(reportSubmissionError);
	};
	const handleAddToTitles = (name: string) => {
		const choice = choices.get(name);
		if (choice?.kind === "linked") {
			setChoice(name, choice, true);
		} else if (
			parseArtistTokenId(release.labels.get(name) ?? "") !== undefined
		) {
			setChoice(name, { kind: "following", releaseName: name }, true);
		} else {
			setUnlinkedName(name);
		}
	};
	const handleFollow = (name: string, releaseName: string) =>
		setChoice(
			name,
			releaseName === NOT_INHERITED
				? undefined
				: { kind: "following", releaseName },
		);
	const handleReset = (key: TrackKey) =>
		editState((state) => resetTrack(state, key));

	// Restore buttons for the titles edited by hand, shown beside their rows.
	const restoreButtons = getUntetheredKeys(
		tracklist.state.text,
		tracklist.state.tether,
	).flatMap((key) => {
		const slot = resetSlots.get(key);
		return slot === undefined
			? []
			: [
					<Fragment key={key}>
						{createPortal(
							<PickerButton
								value="↺ Restore title"
								title="Discard your edit to this title and write it with its artists again"
								onClick={() => handleReset(key)}
							/>,
							slot,
						)}
					</Fragment>,
				];
	});

	return (
		<PickerPanel
			id={PICKER_ID}
			title="Track artists"
			hint="Choose how each artist is named in front of track titles. Featured appearances are excluded. The tracklist updates as you choose."
			footer={
				<>
					{error && <div role="alert">{error}</div>}
					<PickerButton
						value="Undo"
						title="Undo the last change to the tracklist"
						disabled={!tracklist.canUndo}
						onClick={tracklist.undo}
					/>
					<PickerButton
						value="Redo"
						title="Redo the change you undid"
						disabled={!tracklist.canRedo}
						onClick={tracklist.redo}
					/>
					{restoreButtons}
				</>
			}
		>
			{session.names.map((name) => (
				<PickerRow
					key={name}
					name={name}
					status={describeTrackChoice(choices.get(name), labels.get(name))}
					tone={labels.has(name) ? getChoiceTone(choices.get(name)) : "pending"}
					active={name === activeName}
					error={
						unlinkedName === name &&
						choices.get(name)?.kind !== "linked" &&
						parseArtistTokenId(release.labels.get(name) ?? "") === undefined
							? `Link ${name} to a RYM artist first, or use "Put in plain text".`
							: ""
					}
				>
					<SearchButton
						active={name === activeName}
						hasLink={parseArtistTokenId(labels.get(name) ?? "") !== undefined}
						title="Search RYM for this artist, then click a result to link them in track titles"
						onSearch={() => handleLink(name)}
						onCancel={() => {
							setActiveName(undefined);
							void closeShortcutPopup().catch(reportSubmissionError);
						}}
					/>
					<PickerButton
						value="Put in plain text"
						title="Write the name in track titles as plain text, without a link"
						onClick={() => setChoice(name, { kind: "text" })}
					/>
					<PickerButton
						value="Leave out"
						title="Don't name this artist in track titles"
						onClick={() => setChoice(name, { kind: "skipped" })}
					/>
					{release.names.includes(name) && (
						<PickerButton
							value="Add to track titles"
							title="Use this artist's selected RYM link in the titles of their imported tracks"
							onClick={() => handleAddToTitles(name)}
						/>
					)}
					{release.names.length > 0 && (
						<InheritSelect
							placeholder="Same as release artist…"
							title="Use the link chosen for a release artist above"
							inherited={getFollowedName(choices, name)}
							options={release.names.map((releaseName) => ({
								value: releaseName,
								label: releaseName,
							}))}
							onSelect={(releaseName) => handleFollow(name, releaseName)}
						/>
					)}
				</PickerRow>
			))}
		</PickerPanel>
	);
}

// Returns the release artist name's track artist follows, if any.
function getFollowedName(choices: TrackArtistChoices, name: string): string {
	const choice = choices.get(name);
	return choice?.kind === "following" ? choice.releaseName : NOT_INHERITED;
}
