import { fetch } from "~/shared/utils/fetch";

import type { SearchFunction } from "../types";
import { requestToken } from "./auth";
import type { AlbumSearchObject } from "./codecs";

export const search: SearchFunction = async ({
	artist,
	title,
	serviceRegions,
}) => {
	const token = await requestToken();
	const spotifyRegion = serviceRegions?.spotify;
	const response = JSON.parse(
		await fetch({
			url: "https://api.spotify.com/v1/search",
			urlParameters: {
				q: `${artist} ${title}`,
				type: "album",
				...(spotifyRegion ? { market: spotifyRegion } : {}),
			},
			headers: { Authorization: `Bearer ${token.access_token}` },
		}),
	) as AlbumSearchObject;
	console.log(response);
	return response.albums.items[0]?.external_urls.spotify;
};
