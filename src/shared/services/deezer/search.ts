import { fetch } from "~/shared/utils/fetch";

import {
	getSearchArtists,
	getSearchTitleVariants,
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
	const response = await searchAlbums(`artist:"${artist}" album:"${title}"`);
	const album = response.data?.[0];
	if (album) return toUrl(album.link);

	const albumTitle = normalizeSearchTitle(title);
	const artistNames = new Set(
		getSearchArtists(artist, artistAlias).map((name) =>
			normalizeSearchArtist(name),
		),
	);
	for (const variant of getSearchTitleVariants(title).slice(1)) {
		const results = await searchAlbums(`"${artist}" "${variant}"`);
		const match = results.data?.find(
			(candidate) =>
				normalizeSearchTitle(candidate.title) === albumTitle &&
				(normalizeSearchText(artist) === "various artists" ||
					artistNames.has(normalizeSearchArtist(candidate.artist.name))),
		);
		if (match) return toUrl(match.link);
	}
	for (let index = 0; ; index += SEARCH_LIMIT) {
		const results = await searchAlbums(`artist:"${artist}"`, index);
		const match = results.data?.find(
			(candidate) =>
				artistNames.has(normalizeSearchArtist(candidate.artist.name)) &&
				normalizeSearchTitle(candidate.title) === albumTitle,
		);
		if (match) return toUrl(match.link);
		if (!results.next) break;
	}

	const localized = await searchAlbums(`"${artist}" "${title}"`);
	const localizedAlbum = localized.data?.[0];
	if (localized.total === 1 && localizedAlbum)
		return toUrl(localizedAlbum.link);
	return undefined;
};
