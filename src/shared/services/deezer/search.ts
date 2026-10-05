import { fetch } from "~/shared/utils/fetch";

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

const normalize = (value: string): string =>
	value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();

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

export const search: SearchFunction = async ({ artist, title }) => {
	const response = await searchAlbums(`artist:"${artist}" album:"${title}"`);
	const album = response.data?.[0];
	if (album) return album.link;

	const artistName = normalize(artist);
	const albumTitle = normalize(title);
	for (let index = 0; ; index += SEARCH_LIMIT) {
		const results = await searchAlbums(`artist:"${artist}"`, index);
		const match = results.data?.find(
			(candidate) =>
				normalize(candidate.artist.name) === artistName &&
				normalize(candidate.title) === albumTitle,
		);
		if (match) return match.link;
		if (!results.next) break;
	}

	const localized = await searchAlbums(`"${artist}" "${title}"`);
	if (localized.total === 1) return localized.data?.[0]?.link;
	return undefined;
};
