import browser from "webextension-polyfill";

import {
	captureSpotifyPageErrors,
	spotifyPageDiagnostics,
} from "./diagnostics";
import { isFrameRequest, type SearchResult } from "./messages";
import { readSpotifySearchPage } from "./read-results";

// Only the extension's hidden frame host can request a lookup. Ordinary Spotify
// tabs do not participate, and no runtime messages are sent from this frame.
if (window.parent !== window) {
	const pageErrors = captureSpotifyPageErrors();
	const extensionOrigin = browser.runtime.getURL("").replace(/\/$/, "");
	const onRequest = async (event: MessageEvent<unknown>) => {
		if (
			event.source !== window.parent ||
			event.origin !== extensionOrigin ||
			!isFrameRequest(event.data)
		)
			return;
		window.removeEventListener("message", onMessage);
		const { id, category, data } = event.data;
		let result: SearchResult;
		try {
			const url = await readSpotifySearchPage(
				data.artist,
				data.title,
				category,
				data.releaseType ?? null,
			);
			result = url ? { status: "found", url } : { status: "not-found" };
			if (pageErrors.hasErrors())
				result.diagnostics = [pageErrors.diagnostic([data.artist, data.title])];
		} catch (error) {
			result = {
				status: "error",
				message: error instanceof Error ? error.message : String(error),
				diagnostics: [
					{
						stage: "page-reader-failed",
						details: spotifyPageDiagnostics(),
					},
					pageErrors.diagnostic([data.artist, data.title]),
				],
			};
			console.warn("[EvenBetterRYM Spotify]", { id, category, ...result });
		} finally {
			pageErrors.dispose();
		}
		window.parent.postMessage(
			{ type: "ebr-spotify-result", id, result },
			extensionOrigin,
		);
	};
	const onMessage = (event: MessageEvent<unknown>) => {
		void onRequest(event);
	};
	window.addEventListener("message", onMessage);
	window.parent.postMessage({ type: "ebr-spotify-ready" }, extensionOrigin);
}
