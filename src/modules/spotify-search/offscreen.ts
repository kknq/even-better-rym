import browser from "webextension-polyfill";

import { searchHiddenSpotify } from "./hidden-search";
import { isSearchInput } from "./messages";

browser.runtime.onMessage.addListener((message: unknown, sender) => {
	if (
		sender.id !== browser.runtime.id ||
		sender.tab ||
		!sender.url?.startsWith(browser.runtime.getURL("")) ||
		typeof message !== "object" ||
		message === null ||
		!("type" in message) ||
		message.type !== "ebr-spotify-offscreen" ||
		!("data" in message) ||
		!isSearchInput(message.data)
	)
		return undefined;
	// A lookup can span a retry and a track fallback. Keep the MV3 worker alive
	// until it receives the final response and closes this document.
	const heartbeat = setInterval(() => {
		void browser.runtime.sendMessage({ type: "ebr-spotify-heartbeat" });
	}, 20_000);
	return searchHiddenSpotify(message.data).finally(() =>
		clearInterval(heartbeat),
	);
});
