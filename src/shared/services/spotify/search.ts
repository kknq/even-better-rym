import type {
	SpotifySearchRequest,
	SpotifySearchResponse,
} from "~/shared/utils/messaging";
import { sendBackgroundMessage } from "~/shared/utils/messaging";

import type { SearchFunction } from "../types";

export const search: SearchFunction = async ({
	artist,
	title,
	releaseType,
}) => {
	const response = await sendBackgroundMessage<
		SpotifySearchRequest,
		SpotifySearchResponse
	>({
		type: "spotifySearch",
		data: {
			artist,
			title,
			...(releaseType === "single" || releaseType === "music video"
				? { releaseType }
				: {}),
		},
	});
	if (
		response.data.error ||
		response.data.diagnostics?.some(
			(entry) =>
				entry.stage === "page-reader-failed" ||
				entry.stage === "page-runtime-errors",
		)
	) {
		const log = response.data.error ? console.warn : console.info;
		log("[EvenBetterRYM Spotify] search diagnostics", {
			requestId: response.id,
			status: response.data.error
				? "error"
				: response.data.url
					? "found"
					: "not-found",
			...response.data,
		});
	}
	if (response.data.error) throw new Error(response.data.error);
	return response.data.url;
};
