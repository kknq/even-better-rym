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
	if (response.data.error) throw new Error(response.data.error);
	return response.data.url;
};
