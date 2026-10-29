import { resolveSongCredits } from "~/shared/services/applemusic/credits";
import type { Track, TrackCredit } from "~/shared/services/types";
import { getTrackPosition } from "./track-position";

type LoadOptions = {
	isActive: () => boolean;
	onProgress: (completed: number, total: number) => void;
};

export async function loadCreditSuggestions(
	tracks: Track[],
	{ isActive, onProgress }: LoadOptions,
): Promise<{ tracks: Track[]; failedPositions: string[] }> {
	const result = tracks.map((track) => ({ ...track }));
	const pending = result.flatMap((track, index) =>
		!track.header && track.creditsUrl ? [{ track, index }] : [],
	);
	const cache = new Map<string, Promise<TrackCredit[]>>();
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
				const credits = await request;
				item.track.credits = [...(item.track.credits ?? []), ...credits];
			} catch (error) {
				console.warn("EvenBetterRYM: could not load song credits", url, error);
				failedPositions.push(getTrackPosition(item.track, item.index));
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
