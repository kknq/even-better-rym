import { fetch } from "~/shared/utils/fetch";

import {
	getSearchArtists,
	normalizeSearchArtist,
	normalizeSearchText,
} from "../search-matching";
import type { SearchFunction } from "../types";

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
}) => {
	const response = await searchAlbums(`artist:"${artist}" album:"${title}"`);
	const album = response.data?.[0];
	if (album) return album.link;

	const artistNames = new Set(
		getSearchArtists(artist, artistAlias).map((name) =>
			normalizeSearchArtist(name),
		),
	);
	const albumTitle = normalizeSearchText(title);
	for (let index = 0; ; index += SEARCH_LIMIT) {
		const results = await searchAlbums(`artist:"${artist}"`, index);
		const match = results.data?.find(
			(candidate) =>
				artistNames.has(normalizeSearchArtist(candidate.artist.name)) &&
				normalizeSearchText(candidate.title) === albumTitle,
		);
		if (match) return match.link;
		if (!results.next) break;
	}

	const localized = await searchAlbums(`"${artist}" "${title}"`);
	if (localized.total === 1) return localized.data?.[0]?.link;
	return undefined;
};
