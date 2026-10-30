import { asArray } from "~/shared/utils/array";
import { secondsToString, stringToDate } from "~/shared/utils/datetime";
import { fetch } from "~/shared/utils/fetch";
import { getReleaseType } from "~/shared/utils/music";
import { htmlDecode } from "~/shared/utils/string";

import type {
	ReleaseAttribute,
	ReleaseDate,
	ReleaseLabel,
	ResolveFunction,
	Track,
} from "../types";
import type {
	EmbedAlbumData,
	ReleaseData,
	SecondaryAlbumData,
	SecondaryTrackData,
} from "./codec";
import { parseBandcampCredits } from "./credits";

const getData = (document_: Document) => {
	const text = document_.querySelector<HTMLScriptElement>(
		"script[data-tralbum]",
	)?.dataset.tralbum;
	return text ? (JSON.parse(text) as ReleaseData) : undefined;
};

const getSecondaryData = (document_: Document) => {
	const text = document_.querySelector<HTMLScriptElement>(
		'script[type="application/ld+json"]',
	)?.text;

	if (text?.includes("@id")) {
		return JSON.parse(text) as SecondaryAlbumData | SecondaryTrackData;
	}
};

const getDate = (data: ReleaseData): ReleaseDate | undefined => {
	const dateString = data.current.release_date ?? data.album_release_date;
	return dateString ? stringToDate(dateString) : undefined;
};

const getPublishDate = (data: ReleaseData): ReleaseDate | undefined => {
	const dateString = data.current.publish_date;
	return dateString ? stringToDate(dateString) : undefined;
};

const splitConfirmedArtists = (
	artist: string,
	knownArtists: Set<string>,
): string[] => {
	const names = artist.split(",").map((name) => name.trim());
	return names.length > 1 &&
		names.every((name) => knownArtists.has(name.toLocaleLowerCase()))
		? names
		: [artist];
};

const getReleaseArtists = (data: ReleaseData): string[] => {
	const sourceArtists = (asArray(data.artist) ?? [])
		.filter((artist): artist is string => typeof artist === "string")
		.map((artist) => artist.trim());
	const isVariousArtists = sourceArtists.some((artist) =>
		/^(?:various(?: artists)?|v\/a)$/i.test(artist),
	);
	if (isVariousArtists) return ["Various Artists"];

	if (data.item_type !== "album" || data.trackinfo.length < 2) {
		return sourceArtists;
	}
	const trackArtists = data.trackinfo.map(
		(track) => track.artist?.trim() ?? "",
	);
	const distinctTrackArtists = new Set(
		trackArtists.filter(Boolean).map((artist) => artist.toLocaleLowerCase()),
	);
	const compilationDescription =
		/\b(?:compilation|compilaci[oó]n|compila[cç][aã]o|сборник)\b/i.test(
			`${data.current.title}\n${data.current.about ?? ""}`,
		);
	if (
		compilationDescription &&
		trackArtists.every(Boolean) &&
		distinctTrackArtists.size > 1
	) {
		return ["Various Artists"];
	}
	return sourceArtists.flatMap((artist) => {
		if (distinctTrackArtists.has(artist.toLocaleLowerCase())) return [artist];
		return splitConfirmedArtists(artist, distinctTrackArtists);
	});
};

const getTrackAttribution = (title: string, artist?: string | null) => {
	const name = artist?.trim();
	if (!name) return { title };
	const prefixMatches =
		title.slice(0, name.length).toLowerCase() === name.toLowerCase();
	const songTitle = prefixMatches
		? /^\s+[-–—]\s+(\S[\s\S]*)$/.exec(title.slice(name.length))?.[1]
		: undefined;
	return { title: songTitle ?? title, artists: [name] };
};

const getTracks = async (
	data: ReleaseData,
	allowEmbed = true,
): Promise<Track[] | undefined> => {
	if (allowEmbed) {
		const hasMissingDurations = data.trackinfo.some(
			(track) => track.duration === 0,
		);

		if (hasMissingDurations) {
			return getTracksFromEmbed(data);
		}
	}

	if (data.item_type === "track") {
		const trackInfo = data.trackinfo[0];
		if (trackInfo)
			return [
				{
					...getTrackAttribution(trackInfo.title, trackInfo.artist),
					duration: secondsToString(trackInfo.duration),
				},
			];
	} else if (data.item_type === "album") {
		return data.trackinfo.map((track) => ({
			position: track.track_num.toString(),
			...getTrackAttribution(track.title, track.artist),
			duration: secondsToString(track.duration),
		}));
	}
};

const getTracksFromEmbed = async (
	data: ReleaseData,
): Promise<Track[] | undefined> => {
	const url = `https://bandcamp.com/EmbeddedPlayer.html/album=${data.id}/size=large/artwork=small/`;
	const response = await fetch({ url });
	const playerDataStr = /data-player-data="([^"]*)"/.exec(response)?.[1];
	if (!playerDataStr) return;

	const playerDataDecoded = htmlDecode(playerDataStr);
	if (!playerDataDecoded) return;

	const playerData = JSON.parse(playerDataDecoded) as EmbedAlbumData;
	return playerData.tracks.map((track) => {
		const position = track.tracknum + 1;
		const sourceTrack =
			data.item_type === "album"
				? data.trackinfo.find((candidate) => candidate.track_num === position)
				: data.trackinfo[0];
		const artist = [sourceTrack?.artist, track.artist].find((name) =>
			name?.trim(),
		);
		return {
			position: position.toString(),
			...getTrackAttribution(track.title, artist),
			duration: secondsToString(track.duration),
		};
	});
};

const getCoverArt = (document_: Document) => {
	return document_
		.querySelector<HTMLAnchorElement>("#tralbumArt a.popupImage")
		?.href.replace("10.jpg", "0.jpg");
};

export const resolve: ResolveFunction = async (url) => {
	const response = await fetch({ url });
	const document_ = new DOMParser().parseFromString(response, "text/html");
	const data = getData(document_);
	const secondaryData = getSecondaryData(document_);

	const url_ = data?.url ?? url;
	const title = data?.current.title;
	const artists = data ? getReleaseArtists(data) : [];
	const date = data ? getDate(data) : undefined;
	const publishDate = data ? getPublishDate(data) : undefined;
	let tracks = data ? await getTracks(data) : undefined;
	if (data && tracks) {
		const releaseArtists = new Set(
			artists.map((artist) => artist.toLocaleLowerCase()),
		);
		const knownArtists = new Set([
			...releaseArtists,
			...tracks
				.flatMap((track) => track.artists ?? [])
				.map((artist) => artist.toLocaleLowerCase()),
		]);
		tracks = tracks.map((track) =>
			track.artists
				? {
						...track,
						artists: track.artists.flatMap((artist) =>
							releaseArtists.has(artist.toLocaleLowerCase())
								? [artist]
								: splitConfirmedArtists(artist, knownArtists),
						),
					}
				: track,
		);
		const credits = parseBandcampCredits([
			data.current.credits,
			data.current.about,
		]);
		if (credits.length) {
			tracks = tracks.map((track) => {
				const trackNumber = Number(track.position);
				const trackCredits = credits
					.filter(
						(credit) =>
							credit.trackNumber === undefined ||
							credit.trackNumber === trackNumber,
					)
					.map(({ name, role }) => ({ name, role }));
				return trackCredits.length
					? { ...track, credits: trackCredits }
					: track;
			});
		}
	}
	const type = tracks ? getReleaseType(title, tracks.length) : undefined;
	const coverArt = asArray(getCoverArt(document_));

	const attributes: ReleaseAttribute[] = ["downloadable", "streaming"];

	const isCreativeCommons = document_
		.getElementById("license")
		?.textContent?.toLowerCase()
		.includes("some rights reserved");
	if (isCreativeCommons) {
		attributes.push("creative commons");
	}

	let label: ReleaseLabel | undefined;
	if (secondaryData) {
		const albumRelease = (
			secondaryData["@type"] === "MusicAlbum"
				? secondaryData.albumRelease
				: secondaryData.inAlbum.albumRelease
		)[0];

		const labelName = albumRelease?.recordLabel?.name;

		if (labelName) {
			label = { name: labelName };
		}
	}

	return {
		url: url_,
		title,
		artists,
		date,
		publishDate,
		type,
		format: "lossless digital",
		attributes,
		tracks,
		coverArt,
		label,
	};
};
