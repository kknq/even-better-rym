import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { buildArtistToken } from "../utils/artist-shortcuts";
import type { CreditChoice } from "../utils/credit-lines";
import {
	addCreditLine,
	enqueueCreditEdit,
	removeCreditLine,
} from "../utils/credit-lines";
import {
	describeGuestChoice,
	formatCreditTracks,
} from "../utils/guest-credits";
import {
	type ArtistCredit,
	attachCreditRoleSuggestions,
	closeShortcutPopup,
	updateCreditDetails,
} from "../utils/page-functions";
import {
	normalizeArtistName,
	parseArtistToken,
	parseArtistTokenId,
} from "../utils/release-artist-links";
import { reportSubmissionError } from "../utils/report-error";
import {
	startArtistSearch,
	watchArtistResultClicks,
} from "../utils/shortcut-popup";
import type { CreditSuggestion } from "../utils/suggested-credits";
import {
	type ArtistAssociation,
	getCreditedArtistName,
	rememberArtistAssociation,
	useArtistAssociations,
} from "./artist-associations";
import {
	getChoiceTone,
	PickerButton,
	PickerPanel,
	PickerRow,
	SearchButton,
} from "./picker-row";
import { type LatestState, useLatestState } from "./use-latest-state";

type CreditPickerProps = {
	id: string;
	title: string;
	hint: string;
	credits: CreditSuggestion[];
	showDetails?: boolean;
	notice?: ComponentChildren;
	loading?: boolean;
};

type CreditDetails = { name: string; role: string; tracks: string };
type ChosenCredit = Exclude<CreditChoice, { kind: "skipped" }>;
type CreditEditContext = {
	choices: LatestState<Map<string, CreditChoice>>;
	drafts: LatestState<Map<string, CreditDetails>>;
	associations: ReadonlyMap<string, ArtistAssociation>;
	isActive: { current: boolean };
};

const getInitialCreditDetails = (credit: CreditSuggestion): CreditDetails => ({
	name: credit.name,
	role: credit.role,
	tracks: credit.unverified ? "???" : formatCreditTracks(credit.positions),
});

const hasUnresolvedDetails = (
	credit: CreditSuggestion,
	details: CreditDetails,
): boolean =>
	!details.name.trim() ||
	!details.role.trim() ||
	(credit.unverified === true &&
		(details.role.trim() === "???" || details.tracks.trim() === "???"));

const getCreditedChoiceName = (
	choice: CreditChoice | undefined,
	credit: CreditSuggestion,
): string | undefined => {
	if (choice?.kind === "linked")
		return parseArtistToken(choice.token)?.name ?? credit.name;
	if (choice?.kind === "text") return choice.name;
	return undefined;
};

const getLinkedCreditedName = (
	name: string,
	importedName: string,
	artistId: string | undefined,
	canonicalName: string | undefined,
	association: ArtistAssociation | undefined,
): string | undefined => {
	if (artistId === undefined) return undefined;
	if (canonicalName !== undefined) {
		if (normalizeArtistName(name) !== normalizeArtistName(canonicalName))
			return name;
		return undefined;
	}
	if (name !== importedName) return name;
	if (association?.artistId === artistId)
		return getCreditedArtistName(name, association);
	return undefined;
};

const getCreditInput = (
	credit: CreditSuggestion,
	details: CreditDetails,
	artistId: string | undefined,
	association: ArtistAssociation | undefined,
	canonicalArtistName?: string,
): ArtistCredit => {
	const name = details.name.trim();
	const creditedName = getLinkedCreditedName(
		name,
		credit.name,
		artistId,
		canonicalArtistName,
		association,
	);
	let canonicalName: string | undefined;
	if (artistId !== undefined) {
		canonicalName = canonicalArtistName;
		if (canonicalName === undefined && association?.artistId === artistId)
			canonicalName = association.canonicalName;
	}
	return {
		id: artistId,
		name,
		...(canonicalName === undefined ? {} : { canonicalName }),
		...(creditedName === undefined ? {} : { creditedName }),
		role: details.role.trim(),
		tracks: details.tracks.trim(),
	};
};

const getAddedCreditChoice = (
	input: ArtistCredit,
	line: string,
): ChosenCredit => {
	if (input.id === undefined) return { kind: "text", name: input.name, line };
	return {
		kind: "linked",
		token: buildArtistToken(input.id, input.creditedName),
		line,
	};
};

const getKnownArtistToken = (
	choice: CreditChoice | undefined,
	knownId: string | undefined,
	name: string,
	credit: CreditSuggestion,
	association: ArtistAssociation | undefined,
): string | undefined => {
	if (choice?.kind === "linked") return choice.token;
	if (knownId === undefined) return undefined;
	const creditedName =
		name !== credit.name ? name : getCreditedArtistName(name, association);
	return buildArtistToken(knownId, creditedName);
};

const getCreditStatus = (
	choice: CreditChoice | undefined,
	knownToken: string | undefined,
): string => {
	if (choice === undefined) {
		if (knownToken === undefined) return "not chosen yet";
		return `${knownToken} (not credited)`;
	}
	if (choice.kind === "skipped") return "not credited";
	if (choice.kind === "text") return "credited in plain text";
	return choice.token;
};

const getDisplayedCreditStatus = (
	credit: CreditSuggestion,
	choice: CreditChoice | undefined,
	knownToken: string | undefined,
	showDetails: boolean,
): string => {
	if (showDetails || (choice === undefined && knownToken !== undefined))
		return getCreditStatus(choice, knownToken);
	return describeGuestChoice(credit, choice);
};

const getCreditError = (
	credit: CreditSuggestion,
	name: string,
	showDetails: boolean,
	invalidDetails: boolean,
	unlinkedAttemptKey: string | undefined,
	knownId: string | undefined,
): string | undefined => {
	if (showDetails && invalidDetails) {
		if (!name) return "Enter an artist name.";
		if (credit.unverified)
			return "Resolve the suggested role and track scope before crediting.";
		return "Enter a credit role.";
	}
	if (unlinkedAttemptKey === credit.key && knownId === undefined)
		return `Link ${name} to a RYM artist first, or use "Credit in plain text".`;
	return undefined;
};

const updateExistingCredit = async (
	context: CreditEditContext,
	credit: CreditSuggestion,
	previous: ChosenCredit,
	details: CreditDetails,
	updateOnly: "details" | "name",
) => {
	if (previous.line === undefined)
		throw new Error("Could not identify the credit to update");
	if (updateOnly === "details") {
		await updateCreditDetails(
			previous.line,
			details.role.trim(),
			details.tracks.trim(),
		);
		return;
	}
	const artistId =
		previous.kind === "linked" ? parseArtistTokenId(previous.token) : undefined;
	if (previous.kind === "linked" && artistId === undefined)
		throw new Error("Could not identify the linked credit artist");
	const name = details.name.trim();
	if (name === getCreditedChoiceName(previous, credit)) return;
	const artist =
		artistId === undefined ? name : buildArtistToken(artistId, name);
	await updateCreditDetails(
		previous.line,
		details.role.trim(),
		details.tracks.trim(),
		artist,
	);
	if (!context.isActive.current) return;
	let choice: ChosenCredit = { kind: "text", name, line: previous.line };
	if (artistId !== undefined)
		choice = { kind: "linked", token: artist, line: previous.line };
	context.choices.commit(
		new Map(context.choices.latest.current).set(credit.key, choice),
	);
	if (artistId !== undefined) rememberArtistAssociation(name, artistId);
};

const replaceCreditChoice = async (
	context: CreditEditContext,
	credit: CreditSuggestion,
	details: CreditDetails,
	previous: CreditChoice | undefined,
	artistId: string | undefined,
	skip: boolean,
	canonicalArtistName?: string,
) => {
	if (previous && previous.kind !== "skipped")
		await removeCreditLine(previous.line);
	let choice: CreditChoice = { kind: "skipped" };
	const name = details.name.trim();
	if (!skip) {
		const association =
			context.associations.get(normalizeArtistName(name)) ??
			context.associations.get(normalizeArtistName(credit.name));
		const input = getCreditInput(
			credit,
			details,
			artistId,
			association,
			canonicalArtistName,
		);
		const line = await addCreditLine(input);
		choice = getAddedCreditChoice(input, line);
	}
	if (!context.isActive.current) return;
	context.choices.commit(
		new Map(context.choices.latest.current).set(credit.key, choice),
	);
	if (artistId !== undefined && !skip)
		rememberArtistAssociation(name, artistId, canonicalArtistName);
};

const applyCreditEdit = async (
	context: CreditEditContext,
	credit: CreditSuggestion,
	artistId: string | undefined,
	skip: boolean,
	updateOnly?: "details" | "name",
	canonicalArtistName?: string,
) => {
	if (!context.isActive.current) return;
	const previous = context.choices.latest.current.get(credit.key);
	if (updateOnly && (!previous || previous.kind === "skipped")) return;
	const details =
		context.drafts.latest.current.get(credit.key) ??
		getInitialCreditDetails(credit);
	if (!skip && hasUnresolvedDetails(credit, details)) return;
	if (updateOnly && previous && previous.kind !== "skipped") {
		await updateExistingCredit(context, credit, previous, details, updateOnly);
		return;
	}
	await replaceCreditChoice(
		context,
		credit,
		details,
		previous,
		artistId,
		skip,
		canonicalArtistName,
	);
};

type CreditDetailFieldProps = {
	field: "role" | "tracks";
	id: string;
	credit: CreditSuggestion;
	details: CreditDetails;
	loading: boolean;
	onInput: (field: keyof CreditDetails, value: string) => void;
	onChange: () => void;
};

function CreditDetailField({
	field,
	id,
	credit,
	details,
	loading,
	onInput,
	onChange,
}: Readonly<CreditDetailFieldProps>) {
	const isRole = field === "role";
	const label = isRole ? "Suggested role" : "Tracks";
	return (
		<td style={{ padding: "3px 6px" }}>
			<input
				type="text"
				id={isRole ? `${id}-role-${encodeURIComponent(credit.key)}` : undefined}
				data-ebr-credit-role={isRole ? "" : undefined}
				aria-label={`${label} for ${credit.name} (${credit.role})`}
				title={
					isRole
						? "Edit the credit role"
						: "Edit track positions; leave blank for the whole release"
				}
				value={details[field]}
				disabled={loading}
				style={{ width: isRole ? "12em" : "8em" }}
				onInput={(event) => onInput(field, event.currentTarget.value)}
				onFocus={
					isRole
						? (event) => {
								void attachCreditRoleSuggestions(event.currentTarget.id).catch(
									reportSubmissionError,
								);
							}
						: undefined
				}
				onChange={onChange}
			/>
		</td>
	);
}

export function CreditPicker({
	id,
	title,
	hint,
	credits,
	showDetails = false,
	notice,
	loading = false,
}: Readonly<CreditPickerProps>) {
	const [activeKey, setActiveKey] = useState<string | undefined>();
	const [unlinkedAttemptKey, setUnlinkedAttemptKey] = useState<
		string | undefined
	>();
	const associations = useArtistAssociations();
	const drafts = useLatestState(() => new Map<string, CreditDetails>());
	const pendingNameUpdates = useRef(new Map<string, string>());
	const choiceState = useLatestState(() => new Map<string, CreditChoice>());
	const { state: choices, latest } = choiceState;
	const isActive = useRef(true);
	useEffect(() => {
		const cancel = () => {
			isActive.current = false;
		};
		document.addEventListener("importEvent", cancel);
		return () => {
			cancel();
			document.removeEventListener("importEvent", cancel);
		};
	}, []);

	const choose = (
		credit: CreditSuggestion,
		artistId: string | undefined,
		skip = false,
		updateOnly?: "details" | "name",
		onSettled?: () => void,
		canonicalArtistName?: string,
	) => {
		void enqueueCreditEdit(() =>
			applyCreditEdit(
				{ choices: choiceState, drafts, associations, isActive },
				credit,
				artistId,
				skip,
				updateOnly,
				canonicalArtistName,
			),
		)
			.catch(reportSubmissionError)
			.finally(() => onSettled?.());
	};

	const commitArtistName = (credit: CreditSuggestion) => {
		const details =
			drafts.latest.current.get(credit.key) ?? getInitialCreditDetails(credit);
		const name = details.name.trim();
		const pendingName = pendingNameUpdates.current.get(credit.key);
		if (pendingName === name) return;
		const previous = latest.current.get(credit.key);
		if (previous?.kind !== "linked" && previous?.kind !== "text") return;
		const creditedName = getCreditedChoiceName(previous, credit);
		if (name === creditedName) return;

		pendingNameUpdates.current.set(credit.key, name);
		choose(credit, undefined, false, "name", () => {
			if (pendingNameUpdates.current.get(credit.key) === name)
				pendingNameUpdates.current.delete(credit.key);
		});
	};

	useEffect(() => {
		const credit = credits.find((item) => item.key === activeKey);
		if (!credit) return undefined;
		return watchArtistResultClicks(
			(artistId, artistName) => {
				setUnlinkedAttemptKey(undefined);
				setActiveKey(undefined);
				void closeShortcutPopup().catch(reportSubmissionError);
				choose(credit, artistId, false, undefined, undefined, artistName);
			},
			id,
			() => setActiveKey(undefined),
		);
	}, [credits, choices, activeKey, id, associations]);

	const stopSearchingFor = (key: string) => {
		if (key === activeKey) {
			setActiveKey(undefined);
			void closeShortcutPopup().catch(reportSubmissionError);
		}
	};

	return (
		<PickerPanel
			id={id}
			title={title}
			hint={hint}
			footer={notice}
			headers={
				showDetails
					? ["Artist", "Suggested role", "Tracks", "Status", "Actions"]
					: undefined
			}
		>
			{credits.map((credit) => {
				const choice = choices.get(credit.key);
				const details =
					drafts.state.get(credit.key) ?? getInitialCreditDetails(credit);
				const name = details.name.trim();
				const association =
					associations.get(normalizeArtistName(name)) ??
					associations.get(normalizeArtistName(credit.name));
				const knownId =
					choice?.kind === "linked"
						? parseArtistTokenId(choice.token)
						: association?.artistId;
				const knownToken = getKnownArtistToken(
					choice,
					knownId,
					name,
					credit,
					association,
				);
				const status = getDisplayedCreditStatus(
					credit,
					choice,
					knownToken,
					showDetails,
				);
				const invalidDetails = hasUnresolvedDetails(credit, details);
				const error = getCreditError(
					credit,
					name,
					showDetails,
					invalidDetails,
					unlinkedAttemptKey,
					knownId,
				);
				const editField = (field: keyof CreditDetails, value: string) => {
					setUnlinkedAttemptKey(undefined);
					if (field === "name") stopSearchingFor(credit.key);
					drafts.commit(
						new Map(drafts.latest.current).set(credit.key, {
							...(drafts.latest.current.get(credit.key) ?? details),
							[field]: value,
						}),
					);
				};
				return (
					<PickerRow
						key={credit.key}
						name={
							showDetails ? (
								<input
									type="text"
									aria-label={`Artist name for ${credit.name} (${credit.role})`}
									title="Edit the credited artist name; an existing RYM link is preserved"
									value={details.name}
									disabled={loading}
									style={{ width: "16em" }}
									onInput={(event) =>
										editField("name", event.currentTarget.value)
									}
									onBlur={() => commitArtistName(credit)}
									onKeyDown={(event) => {
										if (event.key === "Enter") {
											event.preventDefault();
											commitArtistName(credit);
										}
									}}
								/>
							) : (
								credit.name
							)
						}
						status={status}
						tone={getChoiceTone(choice)}
						active={credit.key === activeKey}
						error={error}
						cells={
							showDetails &&
							(["role", "tracks"] as const).map((field) => (
								<CreditDetailField
									key={field}
									field={field}
									id={id}
									credit={credit}
									details={details}
									loading={loading}
									onInput={editField}
									onChange={() => choose(credit, undefined, false, "details")}
								/>
							))
						}
					>
						<SearchButton
							disabled={loading || invalidDetails}
							active={credit.key === activeKey}
							hasLink={knownId !== undefined}
							title="Search RYM for this artist, then click a result to credit them"
							onSearch={() => {
								setUnlinkedAttemptKey(undefined);
								setActiveKey(credit.key);
								void startArtistSearch(id, name).catch(reportSubmissionError);
							}}
							onCancel={() => stopSearchingFor(credit.key)}
						/>
						<PickerButton
							value="Credit with artist link"
							disabled={loading || invalidDetails}
							title={
								knownId === undefined
									? "Find this artist on RYM first, then try this again"
									: `Add this credit using ${knownToken}`
							}
							onClick={() => {
								stopSearchingFor(credit.key);
								if (knownId === undefined) {
									setUnlinkedAttemptKey(credit.key);
									return;
								}
								setUnlinkedAttemptKey(undefined);
								choose(credit, knownId);
							}}
						/>
						<PickerButton
							value="Credit in plain text"
							disabled={loading || invalidDetails}
							title="Credit the artist as plain text, without a link"
							onClick={() => {
								stopSearchingFor(credit.key);
								setUnlinkedAttemptKey(undefined);
								choose(credit, undefined);
							}}
						/>
						<PickerButton
							value="Don't credit"
							disabled={loading}
							title="Remove this suggested credit"
							onClick={() => {
								stopSearchingFor(credit.key);
								setUnlinkedAttemptKey(undefined);
								choose(credit, undefined, true);
							}}
						/>
					</PickerRow>
				);
			})}
		</PickerPanel>
	);
}
