import { render } from "preact";
import type { ResolveData } from "~/shared/services/types";
import { waitForElement } from "~/shared/utils/dom";
import type { GuestArtist } from "../utils/guest-credits";
import { GUEST_ROLE, getGuestArtists } from "../utils/guest-credits";
import { creditKey } from "../utils/suggested-credits";
import { isVariousArtistsRelease } from "../utils/track-artist-links";
import type { ReleaseOptions } from "../utils/types";
import { ArtistAssociationsProvider } from "./artist-associations";
import { CreditPicker } from "./credit-picker";
import { SuggestedCreditPicker } from "./suggested-credit-picker";
import { useImportSession } from "./use-import-session";

export default async function injectGuestCreditPicker() {
	const credits = await waitForElement("#creditsx");
	const container = document.createElement("div");
	container.style.clear = "both";
	container.style.paddingTop = "0.5em";
	credits.after(container);
	render(
		<ArtistAssociationsProvider>
			<GuestCreditPicker />
			<SuggestedCreditPicker />
		</ArtistAssociationsProvider>,
		container,
	);
}

function getGuestSession(
	data: ResolveData,
	options: ReleaseOptions,
): GuestArtist[] | undefined {
	if (!options.fillFields.credits || !options.fillFields.tracks)
		return undefined;
	const releaseArtists = data.artists ?? [];
	if (isVariousArtistsRelease(releaseArtists)) return undefined;
	const guests = getGuestArtists(data.tracks ?? [], releaseArtists);
	return guests.length === 0 ? undefined : guests;
}

function GuestCreditPicker() {
	const { count, session } = useImportSession(getGuestSession);
	if (session === undefined) return null;
	return (
		<CreditPicker
			key={count}
			id="ebr-guest-credit-picker"
			title="Guest credits"
			hint={`Credit artists who appear on only some tracks as "${GUEST_ROLE}" on those tracks.`}
			credits={session.map((guest) => ({
				...guest,
				key: creditKey(guest.name, GUEST_ROLE),
				role: GUEST_ROLE,
			}))}
		/>
	);
}
