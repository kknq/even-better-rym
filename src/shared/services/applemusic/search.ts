import { fetch } from "~/shared/utils/fetch";

import type { SearchFunction } from "../types";
import type { SearchObject } from "./codec";

export const toGeoAppleMusicUrl = (
	collectionViewUrl: string,
	appleMusicRegion: string,
) => {
	const url = new URL(collectionViewUrl);
	if (url.hostname !== "music.apple.com") return collectionViewUrl;

	const path = url.pathname.split("/");
	if (path.length < 3) return collectionViewUrl;

	url.hostname = "geo.music.apple.com";
	path[1] = appleMusicRegion;
	url.pathname = path.join("/");
	return url.toString();
};

export const search: SearchFunction = async ({
	artist,
	title,
	serviceRegions,
}) => {
	const appleMusicRegion = serviceRegions?.applemusic;
	const response = JSON.parse(
		await fetch({
			url: "https://itunes.apple.com/search",
			method: "GET",
			urlParameters: {
				term: `${artist} ${title}`,
				media: "music",
				entity: "album",
				...(appleMusicRegion ? { country: appleMusicRegion } : {}),
			},
		}),
	) as SearchObject;

	const collectionViewUrl = response.results[0]?.collectionViewUrl;
	if (!collectionViewUrl || !appleMusicRegion) return collectionViewUrl;
	return toGeoAppleMusicUrl(collectionViewUrl, appleMusicRegion);
};
