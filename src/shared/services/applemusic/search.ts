import { fetch } from "~/shared/utils/fetch";
import {
	getAlbumSearchQuery,
	getSearchArtists,
	isExpandedTitle,
	isReissueTitle,
	normalizeSearchText as normalize,
	normalizeSearchArtist,
	normalizeSearchTitle,
	withSearchTitleVariants,
} from "../search-matching";
import type { SearchFunction } from "../types";
import type { SearchObject } from "./codec";

export const toRegionalAppleMusicUrl = (
	collectionViewUrl: string,
	appleMusicRegion: string,
) => {
	const url = new URL(collectionViewUrl);
	if (url.hostname !== "music.apple.com") return collectionViewUrl;

	const path = url.pathname.split("/");
	if (path.length < 3) return collectionViewUrl;

	path[1] = appleMusicRegion;
	url.pathname = path.join("/");
	return url.toString();
};

const searchTitle: SearchFunction = async ({
	artist,
	artistAlias,
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
		appleMusicRegion ? toRegionalAppleMusicUrl(url, appleMusicRegion) : url;
	const artists = getSearchArtists(artist, artistAlias);
	const artistNames = new Set(
		artists.map((name) => normalizeSearchArtist(name)),
	);
	const albumTitle = normalizeSearchTitle(title);
	const isVariousArtists = normalize(artist) === "various artists";
	const hasMatchingArtist = (album: SearchObject["results"][number]) =>
		artistNames.has(normalizeSearchArtist(album.artistName ?? ""));
	const isMatchingAlbum = (album: SearchObject["results"][number]) => {
		if (!album.collectionViewUrl || albumTitle.length === 0) return false;
		const collectionTitle = normalizeSearchTitle(album.collectionName ?? "");
		return (
			collectionTitle === albumTitle ||
			((releaseType === "single" || releaseType === "ep") &&
				(collectionTitle === `${albumTitle} - single` ||
					collectionTitle === `${albumTitle} - ep`))
		);
	};

	const findAlbum = (results: SearchObject["results"]) =>
		results.find(
			(album) => hasMatchingArtist(album) && isMatchingAlbum(album),
		) ??
		results.find(
			(album) =>
				album.collectionViewUrl &&
				hasMatchingArtist(album) &&
				isReissueTitle(album.collectionName ?? "", title),
		) ??
		(isVariousArtists
			? results.find(
					(album) =>
						normalize(album.artistName ?? "").length > 0 &&
						isMatchingAlbum(album),
				)
			: undefined) ??
		results.find(
			(album) =>
				album.collectionViewUrl &&
				hasMatchingArtist(album) &&
				isExpandedTitle(album.collectionName ?? "", title),
		);
	const visitedArtists = new Set<number>();
	const response = await request("search", {
		term: getAlbumSearchQuery(artist, title),
		media: "music",
		entity: "album",
		limit: "200",
	});
	const match = findAlbum(response.results);
	if (match?.collectionViewUrl) return toUrl(match.collectionViewUrl);

	const candidates = await request("search", {
		term: artist,
		media: "music",
		entity: "musicArtist",
		limit: "200",
	});
	for (const candidate of candidates.results) {
		if (
			!artistNames.has(normalizeSearchArtist(candidate.artistName)) ||
			visitedArtists.has(candidate.artistId)
		)
			continue;
		visitedArtists.add(candidate.artistId);
		const albums = await request("lookup", {
			id: String(candidate.artistId),
			entity: "album",
			limit: "200",
		});
		const match = findAlbum(
			albums.results.filter((album) => album.artistId === candidate.artistId),
		);
		if (match?.collectionViewUrl) return toUrl(match.collectionViewUrl);
	}
	return undefined;
};

export const search = withSearchTitleVariants(searchTitle);
