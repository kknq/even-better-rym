import browser from "webextension-polyfill";

import { searchHiddenSpotify } from "~/modules/spotify-search/hidden-search";
import { isSearchInput } from "~/modules/spotify-search/messages";
import { readHiddenTidalCredits } from "~/modules/tidal-credits/hidden-credits";
import { isTidalCreditsInput } from "~/shared/services/tidal/credits-page";

browser.runtime.onMessage.addListener((message: unknown, sender) => {
	if (
		sender.id !== browser.runtime.id ||
		sender.tab ||
		!sender.url?.startsWith(browser.runtime.getURL("")) ||
		typeof message !== "object" ||
		message === null ||
		!("type" in message) ||
		!("data" in message)
	)
		return undefined;
	let pending: Promise<unknown>;
	if (message.type === "ebr-spotify-offscreen" && isSearchInput(message.data)) {
		pending = searchHiddenSpotify(message.data);
	} else if (
		message.type === "ebr-tidal-offscreen" &&
		isTidalCreditsInput(message.data)
	) {
		pending = readHiddenTidalCredits(message.data);
	} else return undefined;
	// Keep the MV3 worker alive until the frame returns its result.
	const heartbeat = setInterval(() => {
		void browser.runtime.sendMessage({ type: "ebr-hidden-page-heartbeat" });
	}, 20_000);
	return pending.finally(() => clearInterval(heartbeat));
});
