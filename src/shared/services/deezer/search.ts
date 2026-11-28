import { fetch } from "~/shared/utils/fetch";

import {
	getSearchArtists,
	getSearchTitleVariants,
	isExpandedTitle,
	normalizeSearchArtist,
	normalizeSearchText,
	normalizeSearchTitle,
} from "../search-matching";
import type { SearchFunction } from "../types";
import { DEEZER_ALBUM_REGEX } from "./regex";

type DeezerSearchResponse = {
	data?: {
		link: string;
		title: string;
		artist: { name: string };
	}[];
	total?: number;
	next?: string;
	error?: { message: string; code: number };
};

const SEARCH_LIMIT = 100;

const searchAlbums = async (
	query: string,
	index = 0,
): Promise<DeezerSearchResponse> => {
	const response = await fetch({
		url: "https://api.deezer.com/search/album",
		method: "GET",
		urlParameters: {
			q: query,
			limit: String(SEARCH_LIMIT),
			index: String(index),
		},
	});
	const data = JSON.parse(response) as DeezerSearchResponse;
	if (data.error)
		throw new Error(
			`Deezer search failed (${data.error.code}): ${data.error.message}`,
		);
	return data;
};

export const search: SearchFunction = async ({
	artist,
	artistAlias,
	title,
	serviceRegions,
}) => {
	const region = serviceRegions?.deezer;
	const toUrl = (link: string) => {
		if (!region) return link;
		const match = DEEZER_ALBUM_REGEX.exec(link);
		if (!match) throw new Error("Unsupported Deezer album URL");
		const url = new URL(link);
		url.pathname = `/${region.toLowerCase()}/album/${match[1]}`;
		return url.toString();
	};
	const albumTitle = normalizeSearchTitle(title);
	const artistNames = new Set(
		getSearchArtists(artist, artistAlias).map((name) =>
			normalizeSearchArtist(name),
		),
	);
	const isMatchingArtist = (
		candidate: NonNullable<DeezerSearchResponse["data"]>[number],
	) =>
		normalizeSearchText(artist) === "various artists" ||
		artistNames.has(normalizeSearchArtist(candidate.artist.name));
	const findAlbum = (results: DeezerSearchResponse) => {
		const albums = results.data?.filter(isMatchingArtist) ?? [];
		return (
			albums.find(
				(candidate) => normalizeSearchTitle(candidate.title) === albumTitle,
			) ?? albums.find((candidate) => isExpandedTitle(candidate.title, title))
		);
	};
	const response = await searchAlbums(`artist:"${artist}" album:"${title}"`);
	const album = findAlbum(response);
	if (album) return toUrl(album.link);
	for (const variant of getSearchTitleVariants(title).slice(1)) {
		const results = await searchAlbums(`"${artist}" "${variant}"`);
		const match = findAlbum(results);
		if (match) return toUrl(match.link);
	}
	let expandedAlbum:
		| NonNullable<DeezerSearchResponse["data"]>[number]
		| undefined;
	for (let index = 0; ; index += SEARCH_LIMIT) {
		const results = await searchAlbums(`artist:"${artist}"`, index);
		const match = results.data?.find(
			(candidate) =>
				artistNames.has(normalizeSearchArtist(candidate.artist.name)) &&
				normalizeSearchTitle(candidate.title) === albumTitle,
		);
		if (match) return toUrl(match.link);
		expandedAlbum ??= results.data?.find(
			(candidate) =>
				isMatchingArtist(candidate) && isExpandedTitle(candidate.title, title),
		);
		if (!results.next) break;
	}

	const localized = await searchAlbums(`"${artist}" "${title}"`);
	const localizedAlbum = findAlbum(localized);
	if (localizedAlbum) return toUrl(localizedAlbum.link);
	if (expandedAlbum) return toUrl(expandedAlbum.link);
	return undefined;
};
