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
import { useLatestState } from "./use-latest-state";

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
): string | undefined =>
	choice?.kind === "linked"
		? (parseArtistToken(choice.token)?.name ?? credit.name)
		: choice?.kind === "text"
			? choice.name
			: undefined;

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
	const {
		state: choices,
		latest,
		commit,
	} = useLatestState(() => new Map<string, CreditChoice>());
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
	) => {
		void enqueueCreditEdit(async () => {
			if (!isActive.current) return;
			const previous = latest.current.get(credit.key);
			if (updateOnly && (!previous || previous.kind === "skipped")) return;
			const details =
				drafts.latest.current.get(credit.key) ??
				getInitialCreditDetails(credit);
			if (!skip && hasUnresolvedDetails(credit, details)) return;
			const name = details.name.trim();
			if (updateOnly && previous && previous.kind !== "skipped") {
				if (previous.line === undefined)
					throw new Error("Could not identify the credit to update");
				if (updateOnly === "name") {
					const artistId =
						previous.kind === "linked"
							? parseArtistTokenId(previous.token)
							: undefined;
					if (previous.kind === "linked" && artistId === undefined)
						throw new Error("Could not identify the linked credit artist");
					if (name === getCreditedChoiceName(previous, credit)) return;
					const artist =
						artistId === undefined ? name : buildArtistToken(artistId, name);
					await updateCreditDetails(
						previous.line,
						details.role.trim(),
						details.tracks.trim(),
						artist,
					);
					if (isActive.current && previous.kind === "text") {
						commit(
							new Map(latest.current).set(credit.key, {
								kind: "text",
								name,
								line: previous.line,
							}),
						);
					}
					if (isActive.current && artistId !== undefined) {
						commit(
							new Map(latest.current).set(credit.key, {
								kind: "linked",
								token: artist,
								line: previous.line,
							}),
						);
						rememberArtistAssociation(name, artistId);
					}
					return;
				}
				await updateCreditDetails(
					previous.line,
					details.role.trim(),
					details.tracks.trim(),
				);
				return;
			}
			if (previous && previous.kind !== "skipped")
				await removeCreditLine(previous.line);
			let choice: CreditChoice = { kind: "skipped" };
			if (!skip) {
				const association =
					associations.get(normalizeArtistName(name)) ??
					associations.get(normalizeArtistName(credit.name));
				const creditedName =
					artistId !== undefined && name !== credit.name
						? name
						: association?.artistId === artistId
							? getCreditedArtistName(name, association)
							: undefined;
				const line = await addCreditLine({
					id: artistId,
					name,
					...(creditedName === undefined ? {} : { creditedName }),
					role: details.role.trim(),
					tracks: details.tracks.trim(),
				});
				choice =
					artistId === undefined
						? { kind: "text", name, line }
						: {
								kind: "linked",
								token: buildArtistToken(artistId, creditedName),
								line,
							};
			}
			if (isActive.current) {
				commit(new Map(latest.current).set(credit.key, choice));
				if (artistId !== undefined && !skip)
					rememberArtistAssociation(name, artistId);
			}
		})
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
			(artistId) => {
				setUnlinkedAttemptKey(undefined);
				setActiveKey(undefined);
				void closeShortcutPopup().catch(reportSubmissionError);
				choose(credit, artistId);
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
				const knownToken =
					choice?.kind === "linked"
						? choice.token
						: knownId === undefined
							? undefined
							: buildArtistToken(
									knownId,
									name !== credit.name
										? name
										: getCreditedArtistName(name, association),
								);
				const status =
					choice === undefined
						? knownId === undefined
							? "not chosen yet"
							: `${knownToken} (not credited)`
						: choice.kind === "skipped"
							? "not credited"
							: choice.kind === "text"
								? "credited in plain text"
								: choice.token;
				const invalidDetails = hasUnresolvedDetails(credit, details);
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
						status={
							showDetails || (choice === undefined && knownId !== undefined)
								? status
								: describeGuestChoice(credit, choice)
						}
						tone={getChoiceTone(choice)}
						active={credit.key === activeKey}
						error={
							showDetails && invalidDetails
								? !name
									? "Enter an artist name."
									: credit.unverified
										? "Resolve the suggested role and track scope before crediting."
										: "Enter a credit role."
								: unlinkedAttemptKey === credit.key && knownId === undefined
									? `Link ${name} to a RYM artist first, or use "Credit in plain text".`
									: undefined
						}
						cells={
							showDetails &&
							(["role", "tracks"] as const).map((field) => (
								<td key={field} style={{ padding: "3px 6px" }}>
									<input
										type="text"
										id={
											field === "role"
												? `${id}-role-${encodeURIComponent(credit.key)}`
												: undefined
										}
										data-ebr-credit-role={field === "role" ? "" : undefined}
										aria-label={`${field === "role" ? "Suggested role" : "Tracks"} for ${credit.name} (${credit.role})`}
										title={
											field === "role"
												? "Edit the credit role"
												: "Edit track positions; leave blank for the whole release"
										}
										value={details[field]}
										disabled={loading}
										style={{ width: field === "role" ? "12em" : "8em" }}
										onInput={(event) =>
											editField(field, event.currentTarget.value)
										}
										onFocus={
											field === "role"
												? (event) => {
														void attachCreditRoleSuggestions(
															event.currentTarget.id,
														).catch(reportSubmissionError);
													}
												: undefined
										}
										onChange={() => choose(credit, undefined, false, "details")}
									/>
								</td>
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
