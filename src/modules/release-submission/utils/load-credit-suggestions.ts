import { resolveSongCredits as resolveAppleMusicCredits } from "~/shared/services/applemusic/credits";
import { resolveSongDetails as resolveDeezerDetails } from "~/shared/services/deezer/credits";
import { createSongCreditsResolver as createSpotifyCreditsResolver } from "~/shared/services/spotify/credits";
import type { Track, TrackCredit } from "~/shared/services/types";
import { normalizeArtistName } from "./release-artist-links";
import { getTrackPosition } from "./track-position";

type LoadOptions = {
	isActive: () => boolean;
	onProgress: (completed: number, total: number) => void;
	releaseArtists?: string[];
};

type CreditDetails = { credits: TrackCredit[]; artists?: string[] };

export async function loadCreditSuggestions(
	tracks: Track[],
	{ isActive, onProgress, releaseArtists = [] }: LoadOptions,
): Promise<{ tracks: Track[]; failedPositions: string[] }> {
	const result = tracks.map((track) => ({ ...track }));
	const pending = result.flatMap((track, index) =>
		!track.header && track.creditsUrl ? [{ track, index }] : [],
	);
	const cache = new Map<string, Promise<CreditDetails>>();
	const knownNames = new Map(
		[...tracks.flatMap((track) => track.artists ?? []), ...releaseArtists].map(
			(name) => [normalizeArtistName(name), name],
		),
	);
	let spotifyResolver:
		| ReturnType<typeof createSpotifyCreditsResolver>
		| undefined;
	const resolveSongCredits = async (url: string): Promise<CreditDetails> => {
		const parsed = new URL(url);
		if (!parsed.username && !parsed.password) {
			if (parsed.origin === "https://music.apple.com")
				return { credits: await resolveAppleMusicCredits(url) };
			if (parsed.origin === "https://open.spotify.com") {
				spotifyResolver ??= createSpotifyCreditsResolver(isActive);
				return { credits: await spotifyResolver(url) };
			}
			if (
				["https://www.deezer.com", "https://deezer.com"].includes(parsed.origin)
			)
				return resolveDeezerDetails(url);
		}
		throw new Error("Unsupported song credits URL");
	};
	const failedPositions: string[] = [];
	let next = 0;
	let completed = 0;
	onProgress(0, pending.length);
	const worker = async () => {
		while (isActive()) {
			const item = pending[next++];
			if (!item) return;
			const url = item.track.creditsUrl;
			if (!url) throw new Error("Missing song credits URL");
			try {
				let request = cache.get(url);
				if (!request) {
					request = resolveSongCredits(url);
					cache.set(url, request);
				}
				const details = await request;
				item.track.credits = [
					...(item.track.credits ?? []),
					...details.credits,
				];
				if (details.artists !== undefined) {
					item.track.artists = [
						...new Set(
							details.artists.map(
								(name) => knownNames.get(normalizeArtistName(name)) ?? name,
							),
						),
					];
				}
			} catch (error) {
				if (isActive()) {
					console.warn(
						"EvenBetterRYM: could not load song credits",
						url,
						error,
					);
					failedPositions.push(getTrackPosition(item.track, item.index));
				}
			}
			completed += 1;
			if (isActive()) onProgress(completed, pending.length);
		}
	};
	await Promise.all(
		Array.from({ length: Math.min(3, pending.length) }, worker),
	);
	return { tracks: result, failedPositions };
}
