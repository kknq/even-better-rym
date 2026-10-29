import { secondsToString, stringToDate } from "~/shared/utils/datetime";
import { fetch } from "~/shared/utils/fetch";
import { getReleaseType } from "~/shared/utils/music";

import { normalizeCreditRole } from "../credit-roles";
import type { ReleaseType, ResolveFunction } from "../types";
import { DEEZER_ALBUM_REGEX } from "./regex";

type Artist = { name: string; role?: string };
type DeezerTrack = {
	id: number;
	title: string;
	duration: number;
	artist?: Artist;
	contributors?: Artist[];
	track_position?: number;
	disk_number?: number;
};
type TrackPage = {
	data: DeezerTrack[];
	next?: string;
	error?: { message: string; code: number };
};
type Album = {
	title: string;
	artist: Artist;
	contributors?: Artist[];
	release_date?: string;
	record_type?: string;
	label?: string;
	cover_xl?: string;
	cover_big?: string;
	nb_tracks: number;
	error?: { message: string; code: number };
};

function checkError(data: { error?: Album["error"] }) {
	if (data.error) {
		throw new Error(
			`Deezer import failed (${data.error.code}): ${data.error.message}`,
		);
	}
}

const releaseTypes: Readonly<Record<string, ReleaseType>> = {
	album: "album",
	ep: "ep",
	single: "single",
	compile: "compilation",
};

export const resolve: ResolveFunction = async (url) => {
	const match = DEEZER_ALBUM_REGEX.exec(url);
	if (!match) throw new Error("Unsupported Deezer album URL");
	const id = match[1];
	const album = JSON.parse(
		await fetch({ url: `https://api.deezer.com/album/${id}` }),
	) as Album;
	checkError(album);
	if (!album.title?.trim() || !album.artist?.name) {
		throw new Error("Could not find Deezer album details");
	}
	const artists = [
		...new Set([
			album.artist.name,
			...(album.contributors ?? [])
				.filter((artist) => artist.role === "Main")
				.map((artist) => artist.name),
		]),
	];
	const tracks: DeezerTrack[] = [];
	let next: string | undefined =
		`https://api.deezer.com/album/${id}/tracks?limit=100`;
	const visited = new Set<string>();
	while (next) {
		const pageUrl = new URL(next, "https://api.deezer.com");
		if (
			pageUrl.origin !== "https://api.deezer.com" ||
			pageUrl.pathname !== `/album/${id}/tracks` ||
			pageUrl.username ||
			pageUrl.password ||
			visited.has(pageUrl.href)
		) {
			throw new Error("Invalid Deezer track pagination");
		}
		visited.add(pageUrl.href);
		const page = JSON.parse(await fetch({ url: pageUrl.href })) as TrackPage;
		checkError(page);
		if (!Array.isArray(page.data)) {
			throw new Error("Could not parse Deezer tracklist");
		}
		tracks.push(...page.data);
		next = page.next;
	}
	if (tracks.length !== album.nb_tracks || tracks.length === 0) {
		throw new Error("Deezer returned an incomplete tracklist");
	}
	if (album.release_date && Number.isNaN(Date.parse(album.release_date))) {
		throw new Error("Could not parse Deezer release date");
	}
	for (const [index, track] of tracks.entries()) {
		if (
			!track ||
			!Number.isSafeInteger(track.id) ||
			track.id <= 0 ||
			typeof track.title !== "string" ||
			!track.title.trim() ||
			!Number.isFinite(track.duration) ||
			track.duration < 0 ||
			(track.track_position !== undefined &&
				(!Number.isSafeInteger(track.track_position) ||
					track.track_position <= 0)) ||
			(track.disk_number !== undefined &&
				(!Number.isSafeInteger(track.disk_number) || track.disk_number <= 0)) ||
			(track.artist !== undefined &&
				(typeof track.artist?.name !== "string" ||
					!track.artist.name.trim())) ||
			(track.contributors !== undefined &&
				(!Array.isArray(track.contributors) ||
					track.contributors.some(
						(artist) =>
							!artist ||
							typeof artist.name !== "string" ||
							!artist.name.trim() ||
							(artist.role !== undefined && typeof artist.role !== "string"),
					)))
		) {
			throw new Error(`Could not parse Deezer track ${index + 1}`);
		}
	}
	const cover = album.cover_xl ?? album.cover_big;
	const multipleDiscs = tracks.some((track) => (track.disk_number ?? 1) > 1);
	return {
		url: `https://www.deezer.com/album/${id}`,
		title: album.title,
		artists,
		date: album.release_date ? stringToDate(album.release_date) : undefined,
		type:
			releaseTypes[album.record_type ?? ""] ??
			getReleaseType(album.title, tracks.length),
		format: "lossless digital",
		attributes: ["streaming"],
		label: album.label ? { name: album.label } : undefined,
		coverArt: cover ? [cover] : undefined,
		tracks: tracks.map((track, index) => {
			const contributors = track.contributors ?? [];
			const trackArtists = [
				...new Set([
					...(track.artist?.name ? [track.artist.name] : []),
					...contributors
						.filter(
							(artist) => artist.role === "Main" || artist.role === "Featured",
						)
						.map((artist) => artist.name),
				]),
			];
			const credits = contributors
				.filter((artist) => artist.role && artist.role !== "Main")
				.map((artist) => ({
					name: artist.name,
					role: normalizeCreditRole(artist.role ?? ""),
				}));
			const position = track.track_position ?? index + 1;
			return {
				position: multipleDiscs
					? `${track.disk_number ?? 1}.${position}`
					: String(position),
				title: track.title,
				duration: secondsToString(track.duration),
				artists: trackArtists,
				...(credits.length > 0 ? { credits } : {}),
				creditsUrl: `https://www.deezer.com/track/${track.id}`,
			};
		}),
	};
};
