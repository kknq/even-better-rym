import { fetch } from "~/shared/utils/fetch";

import type { SearchFunction } from "../types";
import type { SearchObject } from "./codec";

const normalize = (value: string): string =>
	value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();

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
	releaseType,
	serviceRegions,
}) => {
	const appleMusicRegion = serviceRegions?.applemusic;
	const request = async (
		endpoint: "search" | "lookup",
		parameters: Record<string, string>,
	): Promise<SearchObject> => {
		const response = JSON.parse(
			await fetch({
				url: `https://itunes.apple.com/${endpoint}`,
				method: "GET",
				urlParameters: {
					...parameters,
					...(appleMusicRegion ? { country: appleMusicRegion } : {}),
				},
			}),
		) as SearchObject;
		if (response.errorMessage)
			throw new Error(`Apple Music search failed: ${response.errorMessage}`);
		return response;
	};
	const toUrl = (url: string) =>
		appleMusicRegion ? toGeoAppleMusicUrl(url, appleMusicRegion) : url;

	const response = await request("search", {
		term: `${artist} ${title}`,
		media: "music",
		entity: "album",
	});
	const collectionViewUrl = response.results[0]?.collectionViewUrl;
	if (collectionViewUrl) return toUrl(collectionViewUrl);

	const artistName = normalize(artist);
	const albumTitle = normalize(title);
	const artists = await request("search", {
		term: artist,
		media: "music",
		entity: "musicArtist",
		limit: "200",
	});
	for (const candidate of artists.results) {
		if (normalize(candidate.artistName) !== artistName) continue;
		const albums = await request("lookup", {
			id: String(candidate.artistId),
			entity: "album",
			limit: "200",
		});
		const match = albums.results.find((album) => {
			if (!album.collectionViewUrl || album.artistId !== candidate.artistId)
				return false;
			const collectionTitle = normalize(album.collectionName ?? "");
			return (
				collectionTitle === albumTitle ||
				((releaseType === "single" || releaseType === "ep") &&
					collectionTitle === `${albumTitle} - ${releaseType}`)
			);
		});
		if (match?.collectionViewUrl) return toUrl(match.collectionViewUrl);
	}
	return undefined;
};
