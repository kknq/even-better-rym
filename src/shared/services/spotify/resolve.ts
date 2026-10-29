import { asArray } from "~/shared/utils/array";
import { secondsToString } from "~/shared/utils/datetime";
import { fetch } from "~/shared/utils/fetch";
import { getReleaseType } from "~/shared/utils/music";

import type {
	ReleaseDate,
	ResolveData,
	ResolveFunction,
	Track,
} from "../types";
import { requestToken } from "./auth";
import type {
	AlbumObject,
	AlbumTracks,
	AlbumType,
	SimplifiedTrackObject,
	TrackObject,
} from "./codecs";
import { isAlbumObject } from "./codecs";
import { regex } from "./regex";

type LinkType = "track" | "album";
const isValidLinkType = (type: string): type is LinkType =>
	type === "track" || type === "album";

const parseDate = (date: string): ReleaseDate => {
	const [year, month, day] = date.split("-");
	return {
		year: year ? Number.parseInt(year, 10) : undefined,
		month: month ? Number.parseInt(month, 10) : undefined,
		day: day ? Number.parseInt(day, 10) : undefined,
	};
};

const getPosition = (
	track: SimplifiedTrackObject,
	numberOfDiscs: number,
): string =>
	numberOfDiscs === 1
		? track.track_number.toString()
		: `${track.disc_number}.${track.track_number}`;

const getTracks = async (
	tracks: AlbumTracks,
	token: string,
): Promise<Track[]> => {
	let next = tracks.next;
	const allTracks = [...tracks.items];
	while (next !== null) {
		const nextResponse = JSON.parse(
			await fetch({
				url: next,
				headers: { Authorization: `Bearer ${token}` },
			}),
		) as AlbumTracks;
		allTracks.push(...nextResponse.items);
		next = nextResponse.next;
	}

	const numberOfDiscs = new Set(allTracks.map((track) => track.disc_number))
		.size;
	return allTracks.map((track) => ({
		position: getPosition(track, numberOfDiscs),
		title: track.name,
		duration: secondsToString(track.duration_ms / 1000),
		artists: track.artists.map((artist) => artist.name),
		creditsUrl: `https://open.spotify.com/track/${track.id}`,
	}));
};

const parseType = (type: AlbumType, title: string, numberOfTracks: number) =>
	type === "compilation" ? type : getReleaseType(title, numberOfTracks);

const getCoverArt = async (
	data: AlbumObject | TrackObject,
): Promise<string | undefined> => {
	const images = isAlbumObject(data) ? data.images : data.album.images;
	const best = images.toSorted(
		(a, b) => b.width * b.height - a.width * a.height,
	)[0];
	if (!best?.url) return undefined;

	const match = /([a-z0-9]{12})([a-z0-9]{4})([a-z0-9]{24})$/.exec(best.url);
	if (match && match[2] !== "82c1") {
		const fullResUrl = best.url.replace(
			/([a-z0-9]{12})([a-z0-9]{4})([a-z0-9]{24})$/,
			`$182c1$3`,
		);
		try {
			const body = await fetch({ url: fullResUrl });
			if (body && body.length > 0) return fullResUrl;
		} catch {
			// ignore
		}
	}
	return best.url;
};

const resolveAlbum = async (
	id: string,
	token: string,
): Promise<ResolveData> => {
	const response = JSON.parse(
		await fetch({
			url: `https://api.spotify.com/v1/albums/${id}`,
			headers: { Authorization: `Bearer ${token}` },
		}),
	) as AlbumObject;

	const url = response.external_urls.spotify;
	const title = response.name;
	const artists = response.artists.map((artist) => artist.name);
	const date = parseDate(response.release_date);
	const tracks = await getTracks(response.tracks, token);
	const type = parseType(response.album_type, title, tracks.length);
	const coverArt = asArray(await getCoverArt(response));
	const label = {
		name: response.copyrights[0]?.text
			// https://github.com/jgchk/better-rym/issues/128
			.replaceAll("©", "")
			.trim()
			.replace(/^\d+/, "")
			.trim(),
	};

	return {
		url,
		title,
		artists,
		date,
		type,
		format: "lossless digital",
		attributes: ["streaming"],
		tracks,
		coverArt,
		label,
	};
};

const resolveTrack = async (
	id: string,
	token: string,
): Promise<ResolveData> => {
	const response = JSON.parse(
		await fetch({
			url: `https://api.spotify.com/v1/tracks/${id}`,
			headers: { Authorization: `Bearer ${token}` },
		}),
	) as TrackObject;

	const url = response.external_urls.spotify;
	const title = response.name;
	const artists = response.artists.map((artist) => artist.name);
	const date = parseDate(response.album.release_date);
	const tracks = [
		{
			position: "1",
			title: response.name,
			duration: secondsToString(response.duration_ms / 1000),
			artists,
			creditsUrl: `https://open.spotify.com/track/${id}`,
		},
	];
	const coverArt = asArray(await getCoverArt(response));

	return {
		url,
		title,
		artists,
		date,
		type: "single",
		format: "digital file",
		attributes: ["streaming"],
		tracks,
		coverArt,
	};
};

export const resolve: ResolveFunction = async (url) => {
	const match = regex.exec(url);
	if (match === null) throw new Error("Invalid Spotify URL");

	const type = match[1];
	if (!type || !isValidLinkType(type))
		throw new Error(
			`Expected link to be album/track. Received: ${String(type)}`,
		);

	const id = match[2];
	if (!id) throw new Error("Could not find ID in link");

	const { access_token } = await requestToken();
	return type === "album"
		? resolveAlbum(id, access_token)
		: resolveTrack(id, access_token);
};
