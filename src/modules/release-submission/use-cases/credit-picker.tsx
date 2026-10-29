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

type CreditDetails = { role: string; tracks: string };

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
	const associations = useArtistAssociations();
	const drafts = useLatestState(() => new Map<string, CreditDetails>());
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
		updateOnly = false,
	) => {
		void enqueueCreditEdit(async () => {
			if (!isActive.current) return;
			const previous = latest.current.get(credit.key);
			if (updateOnly && (!previous || previous.kind === "skipped")) return;
			const details = drafts.latest.current.get(credit.key) ?? {
				role: credit.role,
				tracks: formatCreditTracks(credit.positions),
			};
			if (!skip && !details.role.trim()) return;
			if (updateOnly && previous && previous.kind !== "skipped") {
				if (previous.line === undefined)
					throw new Error("Could not identify the credit to update");
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
				const association = associations.get(normalizeArtistName(credit.name));
				const creditedName =
					association?.artistId === artistId
						? getCreditedArtistName(credit.name, association)
						: undefined;
				const line = await addCreditLine({
					id: artistId,
					name: credit.name,
					...(creditedName === undefined ? {} : { creditedName }),
					role: details.role.trim(),
					tracks: details.tracks.trim(),
				});
				choice =
					artistId === undefined
						? { kind: "text", line }
						: {
								kind: "linked",
								token: buildArtistToken(artistId, creditedName),
								line,
							};
			}
			if (isActive.current) {
				commit(new Map(latest.current).set(credit.key, choice));
				if (artistId !== undefined && !skip)
					rememberArtistAssociation(credit.name, artistId);
			}
		}).catch(reportSubmissionError);
	};

	useEffect(() => {
		const credit = credits.find((item) => item.key === activeKey);
		if (!credit) return undefined;
		return watchArtistResultClicks(
			(artistId) => {
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
				const association = associations.get(normalizeArtistName(credit.name));
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
									getCreditedArtistName(credit.name, association),
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
				const details = drafts.state.get(credit.key) ?? {
					role: credit.role,
					tracks: formatCreditTracks(credit.positions),
				};
				const invalidRole = !details.role.trim();
				const editField = (field: keyof CreditDetails, value: string) => {
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
						name={credit.name}
						status={
							showDetails || (choice === undefined && knownId !== undefined)
								? status
								: describeGuestChoice(credit, choice)
						}
						tone={getChoiceTone(choice)}
						active={credit.key === activeKey}
						error={
							showDetails && invalidRole ? "Enter a credit role." : undefined
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
										onChange={() => choose(credit, undefined, false, true)}
									/>
								</td>
							))
						}
					>
						<SearchButton
							disabled={loading || invalidRole}
							active={credit.key === activeKey}
							hasLink={knownId !== undefined}
							title="Search RYM for this artist, then click a result to credit them"
							onSearch={() => {
								setActiveKey(credit.key);
								void startArtistSearch(id, credit.name).catch(
									reportSubmissionError,
								);
							}}
							onCancel={() => stopSearchingFor(credit.key)}
						/>
						<PickerButton
							value="Credit with artist link"
							disabled={loading || invalidRole || knownId === undefined}
							title={
								knownId === undefined
									? "Choose a RYM artist link first"
									: `Add this credit using ${knownToken}`
							}
							onClick={() => {
								stopSearchingFor(credit.key);
								choose(credit, knownId);
							}}
						/>
						<PickerButton
							value="Credit in plain text"
							disabled={loading || invalidRole}
							title="Credit the artist as plain text, without a link"
							onClick={() => {
								stopSearchingFor(credit.key);
								choose(credit, undefined);
							}}
						/>
						<PickerButton
							value="Don't credit"
							disabled={loading}
							title="Remove this suggested credit"
							onClick={() => {
								stopSearchingFor(credit.key);
								choose(credit, undefined, true);
							}}
						/>
					</PickerRow>
				);
			})}
		</PickerPanel>
	);
}
