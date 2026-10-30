import browser from "webextension-polyfill";
import { readTidalCreditsPage } from "~/shared/services/tidal/credits-page";
import { isFrameRequest } from "./messages";

if (window.parent !== window) {
	const extensionOrigin = browser.runtime.getURL("").replace(/\/$/, "");
	const onMessage = (event: MessageEvent<unknown>) => {
		if (
			event.source !== window.parent ||
			event.origin !== extensionOrigin ||
			!isFrameRequest(event.data)
		)
			return;
		window.removeEventListener("message", onMessage);
		const { id, data } = event.data;
		void readTidalCreditsPage(data.albumId, data.trackIds).then((result) =>
			window.parent.postMessage(
				{ type: "ebr-tidal-result", id, result },
				extensionOrigin,
			),
		);
	};
	window.addEventListener("message", onMessage);
	window.parent.postMessage({ type: "ebr-tidal-ready" }, extensionOrigin);
}
