import { secondsToString, stringToDate } from "~/shared/utils/datetime";
import { getReleaseType, withVersion } from "~/shared/utils/music";
import type { ResolveFunction } from "../types";
import { createAlbumLoader } from "./api";
import { readAlbum } from "./codec";
import { readTrackCredits } from "./credits";
import { QOBUZ_ALBUM_REGEX } from "./regex";

export const resolve: ResolveFunction = async (url) => {
	const match = QOBUZ_ALBUM_REGEX.exec(url);
	const id = match?.[1] ?? match?.[2];
	if (!id) throw new Error("Unsupported Qobuz album URL");
	const usUrl = match?.[2]
		? `https://www.qobuz.com/us-en/album/-/${id}`
		: url
				.replace(/^http:/, "https:")
				.replace(/(?<=qobuz\.com\/)[a-z]{2}-[a-z]{2}/i, "us-en")
				.split(/[?#]/)[0];
	const load = await createAlbumLoader(id);
	const album = readAlbum(await load(0), id, 0);
	const artists = [
		...new Set([
			...(album.artist ? [album.artist.name] : []),
			...album.artists
				.filter((artist) => artist.roles.includes("main-artist"))
				.map((artist) => artist.name),
		]),
	];
	if (artists.length === 0)
		throw new Error("Could not find Qobuz album artists");
	const tracks = [...album.tracks];
	const trackIds = new Set(tracks.map((track) => track.id));
	if (tracks.length === 0 || trackIds.size !== tracks.length) {
		throw new Error("Qobuz returned an incomplete or invalid tracklist");
	}
	while (tracks.length < album.tracksCount) {
		const offset = tracks.length;
		const page = readAlbum(await load(offset), id, offset);
		if (
			page.tracksCount !== album.tracksCount ||
			page.mediaCount !== album.mediaCount ||
			page.tracks.length === 0 ||
			page.tracks.some((track) => trackIds.has(track.id))
		) {
			throw new Error("Qobuz returned an incomplete or repeated track page");
		}
		for (const track of page.tracks) trackIds.add(track.id);
		tracks.push(...page.tracks);
	}
	if (
		tracks.length !== album.tracksCount ||
		trackIds.size !== tracks.length ||
		tracks.some((track) => track.media_number > album.mediaCount)
	) {
		throw new Error("Qobuz returned an incomplete or invalid tracklist");
	}
	if (album.date && Number.isNaN(Date.parse(album.date))) {
		throw new Error("Could not parse Qobuz release date");
	}
	const title = withVersion(album.title, album.version);
	return {
		url: usUrl,
		title,
		artists,
		date: album.date ? stringToDate(album.date) : undefined,
		type: getReleaseType(title, tracks.length),
		format: "lossless digital",
		attributes: ["downloadable", "streaming"],
		tracks: tracks.map((track) => ({
			position:
				album.mediaCount > 1
					? `${track.media_number}.${track.track_number}`
					: String(track.track_number),
			title: withVersion(track.title, track.version),
			duration: secondsToString(track.duration),
			...readTrackCredits(track, artists),
		})),
		coverArt: album.cover
			? [album.cover.replace("_600.jpg", "_max.jpg")]
			: undefined,
		label: album.label ? { name: album.label } : undefined,
	};
};
