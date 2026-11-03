import browser from "webextension-polyfill";

import { searchHiddenSpotify } from "~/modules/spotify-search/hidden-search";
import {
	isSearchResult,
	type SearchDiagnostic,
	type SearchResult,
} from "~/modules/spotify-search/messages";
import type {
	SpotifySearchRequest,
	SpotifySearchResponse,
} from "~/shared/utils/messaging";
import { createSerialQueue } from "~/shared/utils/serial-queue";
import * as storage from "~/shared/utils/storage";
import { readHiddenPage } from "./hidden-page";

type SearchFailure = {
	requestId: string;
	timestamp: string;
	manifestVersion: number;
	status: SearchResult["status"];
	error?: string;
	diagnostics: SearchDiagnostic[];
};

const saveQueue = createSerialQueue();
const saveFailure = async (
	requestId: string,
	result: SearchResult,
): Promise<void> => {
	if (
		result.status !== "error" &&
		!result.diagnostics?.some(
			(entry) =>
				entry.stage === "page-reader-failed" ||
				entry.stage === "page-runtime-errors",
		)
	)
		return;
	const failure: SearchFailure = {
		requestId,
		timestamp: new Date().toISOString(),
		manifestVersion: browser.runtime.getManifest().manifest_version,
		status: result.status,
		...(result.status === "error" ? { error: result.message } : {}),
		diagnostics: result.diagnostics ?? [],
	};
	try {
		await saveQueue(async () => {
			const history =
				(await storage.get<SearchFailure[]>("spotifySearchFailures")) ?? [];
			await storage.set(
				"spotifySearchFailures",
				[...history, failure].slice(-20),
			);
		});
	} catch (error) {
		console.error("[EvenBetterRYM Spotify] failed to save diagnostics", {
			requestId,
			error,
		});
	}
};

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
			await saveFailure(request.id, result);
			return {
				id: request.id,
				type: "spotifySearch",
				data: {
					...(result.status === "error"
						? { error: result.message }
						: result.status === "found"
							? { url: result.url }
							: {}),
					...(result.diagnostics ? { diagnostics: result.diagnostics } : {}),
				},
			};
		} catch (error) {
			console.error("[EvenBetterRYM Spotify] background failure", {
				requestId: request.id,
				error,
			});
			const message = error instanceof Error ? error.message : String(error);
			await saveFailure(request.id, { status: "error", message });
			return {
				id: request.id,
				type: "spotifySearch",
				data: { error: message },
			};
		}
	})();
};
