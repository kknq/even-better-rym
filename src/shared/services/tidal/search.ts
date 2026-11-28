import { fetch } from "~/shared/utils/fetch";
import {
	getAlbumSearchQuery,
	getSearchArtists,
	isReissueTitle,
	normalizeSearchArtist,
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
	const foldedArtistNames = new Set(
		artists.map((name) => normalizeSearchArtist(name)),
	);
	const searchQuery = getAlbumSearchQuery(artist, title);
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
	const getArtistNames = (album: TidalResource): string[] =>
		(album.relationships?.artists?.data ?? []).flatMap((artist) => {
			const name = included.get(`${artist.type}:${artist.id}`)?.attributes
				?.name;
			return name === undefined ? [] : [name];
		});
	const matches = (data.data ?? [])
		.flatMap((result) => result.relationships?.albums?.data ?? [])
		.map((album) => included.get(`albums:${album.id}`))
		.filter(
			(album): album is TidalResource =>
				album !== undefined &&
				getArtistNames(album).some((name) =>
					foldedArtistNames.has(normalizeSearchArtist(name)),
				),
		);
	const exactArtists = matches.filter((album) =>
		getArtistNames(album).some((name) =>
			artistNames.has(normalizeSearchText(name)),
		),
	);
	const normalizedTitle = normalizeSearchText(title);
	const hasExactTitle = (album: TidalResource) =>
		normalizeSearchText(album.attributes?.title ?? "") === normalizedTitle;
	const hasReissueTitle = (album: TidalResource) =>
		isReissueTitle(album.attributes?.title ?? "", title);
	const hasSoundtrackTitle = (album: TidalResource) => {
		const candidate = normalizeSearchText(album.attributes?.title ?? "");
		return (
			normalizedTitle.length > 0 &&
			candidate.startsWith(normalizedTitle) &&
			/^\s+\((?:original (?:motion picture )?)?soundtrack\)$/.test(
				candidate.slice(normalizedTitle.length),
			)
		);
	};
	const album =
		exactArtists.find(hasExactTitle) ??
		matches.find(hasExactTitle) ??
		exactArtists.find(hasReissueTitle) ??
		matches.find(hasReissueTitle) ??
		exactArtists.find(hasSoundtrackTitle) ??
		matches.find(hasSoundtrackTitle);
	if (album) {
		return `https://tidal.com/browse/album/${album.id}`;
	}
	return undefined;
};
