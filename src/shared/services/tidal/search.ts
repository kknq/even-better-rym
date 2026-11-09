import { fetch } from "~/shared/utils/fetch";
import {
	getSearchArtists,
	isReissueTitle,
	normalizeSearchText,
} from "../search-matching";
import type { SearchFunction } from "../types";
import { requestToken } from "./auth";

type TidalAlbum = {
	id: string;
};

type TidalResource = {
	id: string;
	type: string;
	attributes?: { title?: string; name?: string };
	relationships?: { artists?: { data?: { id: string; type: string }[] } };
};

type TidalSearchResponse = {
	data?: {
		relationships?: {
			albums?: {
				data?: TidalAlbum[];
			};
		};
	}[];
	included?: TidalResource[];
	errors?: { detail?: string; title?: string }[];
};

export const search: SearchFunction = async ({
	artist,
	artistAlias,
	title,
	serviceRegions,
}) => {
	const token = await requestToken();
	const artists = getSearchArtists(artist, artistAlias);
	const artistNames = new Set(artists.map(normalizeSearchText));
	const searchQuery = `${artist} ${title}`;
	const response = await fetch({
		url: "https://openapi.tidal.com/v2/searchResults",
		method: "GET",
		headers: {
			Authorization: `Bearer ${token.access_token}`,
			Accept: "application/vnd.api+json",
			"Content-Type": "application/vnd.api+json",
		},
		urlParameters: {
			"filter[query]": searchQuery,
			explicitFilter: "INCLUDE",
			countryCode: serviceRegions?.tidal ?? "US",
			include: "albums,albums.artists",
		},
	});

	if (!response || response === "") {
		return undefined;
	}

	const data = JSON.parse(response) as TidalSearchResponse;
	if (data.errors?.length) {
		throw new Error(
			`Tidal search failed: ${data.errors
				.map((error) => error.detail ?? error.title ?? "Unknown error")
				.join("; ")}`,
		);
	}
	const included = new Map(
		(data.included ?? []).map((resource) => [
			`${resource.type}:${resource.id}`,
			resource,
		]),
	);
	const matches = (data.data ?? [])
		.flatMap((result) => result.relationships?.albums?.data ?? [])
		.map((album) => included.get(`albums:${album.id}`))
		.filter(
			(album): album is TidalResource =>
				album !== undefined &&
				(album.relationships?.artists?.data ?? []).some((artist) => {
					const name = included.get(`${artist.type}:${artist.id}`)?.attributes
						?.name;
					return (
						name !== undefined && artistNames.has(normalizeSearchText(name))
					);
				}),
		);
	const album =
		matches.find(
			(candidate) =>
				normalizeSearchText(candidate.attributes?.title ?? "") ===
				normalizeSearchText(title),
		) ??
		matches.find((candidate) =>
			isReissueTitle(candidate.attributes?.title ?? "", title),
		);
	if (album) {
		return `https://tidal.com/browse/album/${album.id}`;
	}
	return undefined;
};
