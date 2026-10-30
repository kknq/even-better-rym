import browser from "webextension-polyfill";

import { searchHiddenSpotify } from "~/modules/spotify-search/hidden-search";
import { isSearchResult } from "~/modules/spotify-search/messages";
import type {
	SpotifySearchRequest,
	SpotifySearchResponse,
} from "~/shared/utils/messaging";
import { readHiddenPage } from "./hidden-page";

export const spotifySearch = (
	request: SpotifySearchRequest,
): Promise<SpotifySearchResponse> => {
	console.info("[EvenBetterRYM Spotify] queued", { requestId: request.id });
	return (async (): Promise<SpotifySearchResponse> => {
		console.info("[EvenBetterRYM Spotify] started", {
			requestId: request.id,
			manifestVersion: browser.runtime.getManifest().manifest_version,
		});
		try {
			const result = await readHiddenPage({
				name: "Spotify search",
				frameUrlPrefix: "https://open.spotify.com/search/",
				message: { type: "ebr-spotify-offscreen", data: request.data },
				readBackground: () => searchHiddenSpotify(request.data),
				isResult: isSearchResult,
			});
			const log = result.status === "error" ? console.warn : console.info;
			log("[EvenBetterRYM Spotify] completed", {
				requestId: request.id,
				...result,
			});
			return {
				id: request.id,
				type: "spotifySearch",
				data:
					result.status === "error"
						? { error: result.message }
						: result.status === "found"
							? { url: result.url }
							: {},
			};
		} catch (error) {
			console.error("[EvenBetterRYM Spotify] background failure", {
				requestId: request.id,
				error,
			});
			return {
				id: request.id,
				type: "spotifySearch",
				data: { error: error instanceof Error ? error.message : String(error) },
			};
		}
	})();
};
