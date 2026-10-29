import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

import type { ResolveData } from "~/shared/services/types";
import { waitForElement } from "~/shared/utils/dom";

import { buildArtistToken } from "../utils/artist-shortcuts";
import { addCreditLine, removeCreditLine } from "../utils/credit-lines";
import type { GuestArtist, GuestChoice } from "../utils/guest-credits";
import {
	describeGuestChoice,
	formatCreditTracks,
	GUEST_ROLE,
	getGuestArtists,
} from "../utils/guest-credits";
import { closeShortcutPopup } from "../utils/page-functions";
import {
	continueArtistSearch,
	startArtistSearch,
	watchArtistResultClicks,
} from "../utils/shortcut-popup";
import { isVariousArtistsRelease } from "../utils/track-artist-links";
import { PickerButton, PickerRow } from "./picker-row";
import { useImportSession } from "./use-import-session";

const PICKER_ID = "ebr-guest-credit-picker";

export default async function injectGuestCreditPicker() {
	const credits = await waitForElement("#creditsx");
	const container = document.createElement("div");
	credits.after(container);
	render(<GuestCreditPicker />, container);
}

// Returns the guests to credit for an import, or undefined on a Various
// Artists release, whose tracks are linked to their own artists instead.
function getGuestSession(data: ResolveData): GuestArtist[] | undefined {
	const releaseArtists = data.artists ?? [];
	const tracks = data.tracks ?? [];
	if (isVariousArtistsRelease(releaseArtists)) {
		return undefined;
	}
	const guests = getGuestArtists(tracks, releaseArtists);
	return guests.length === 0 ? undefined : guests;
}

// Removes the credit line a guest's choice added, if any.
async function removeChoiceCredit(
	choice: GuestChoice | undefined,
): Promise<void> {
	if (choice !== undefined && choice.kind !== "skipped") {
		await removeCreditLine(choice.line);
	}
}

// Replaces the credit line a guest's previous choice added with one crediting
// them on their tracks, linked to the RYM artist id or as plain text when
// there is none, and returns the new line's number.
async function replaceGuestCredit(
	previous: GuestChoice | undefined,
	guest: GuestArtist,
	id: string | undefined,
): Promise<string | undefined> {
	await removeChoiceCredit(previous);
	return addCreditLine({
		id,
		name: guest.name,
		role: GUEST_ROLE,
		tracks: formatCreditTracks(guest.positions),
	});
}

function GuestCreditPicker() {
	const { count, session } = useImportSession(getGuestSession);
	if (session === undefined) {
		return null;
	}
	return <GuestCreditPanel key={count} guests={session} />;
}

type GuestCreditPanelProps = {
	guests: GuestArtist[];
};

function GuestCreditPanel({ guests }: Readonly<GuestCreditPanelProps>) {
	const [activeName, setActiveName] = useState<string | undefined>();
	const [choices, setChoices] = useState(new Map<string, GuestChoice>());
	const updateChoice = (guest: GuestArtist, choice: GuestChoice) =>
		setChoices((previous) => new Map(previous).set(guest.name, choice));

	useEffect(() => {
		const guest = guests.find(({ name }) => name === activeName);
		if (guest === undefined) {
			return undefined;
		}
		return watchArtistResultClicks((assocId) => {
			const token = buildArtistToken(assocId);
			const nextName = guests.find(
				({ name }) => name !== guest.name && !choices.has(name),
			)?.name;
			setActiveName(nextName);
			continueArtistSearch(PICKER_ID, nextName);
			void replaceGuestCredit(choices.get(guest.name), guest, assocId).then(
				(line) => updateChoice(guest, { kind: "linked", token, line }),
			);
		});
	}, [guests, choices, activeName]);

	const handleLink = (name: string) => {
		setActiveName(name);
		startArtistSearch(PICKER_ID, name);
	};
	const stopSearchingFor = (guest: GuestArtist) => {
		if (guest.name === activeName) {
			setActiveName(undefined);
			closeShortcutPopup();
		}
	};
	const handleText = (guest: GuestArtist) => {
		stopSearchingFor(guest);
		void replaceGuestCredit(choices.get(guest.name), guest, undefined).then(
			(line) => updateChoice(guest, { kind: "text", line }),
		);
	};
	const handleSkip = (guest: GuestArtist) => {
		stopSearchingFor(guest);
		void removeChoiceCredit(choices.get(guest.name));
		updateChoice(guest, { kind: "skipped" });
	};

	return (
		<div id={PICKER_ID} style={{ marginTop: "1em" }}>
			<b>Guest credits</b>
			{guests.map((guest) => (
				<PickerRow
					key={guest.name}
					name={guest.name}
					status={describeGuestChoice(guest, choices.get(guest.name))}
					active={guest.name === activeName}
				>
					<PickerButton value="Link" onClick={() => handleLink(guest.name)} />
					<PickerButton value="Text" onClick={() => handleText(guest)} />
					<PickerButton value="Skip" onClick={() => handleSkip(guest)} />
				</PickerRow>
			))}
		</div>
	);
}
