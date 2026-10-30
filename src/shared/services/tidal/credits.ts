import type {
	TidalCreditsRequest,
	TidalCreditsResponse,
} from "~/shared/utils/messaging";
import { sendBackgroundMessage } from "~/shared/utils/messaging";
import { normalizeCreditRole } from "../credit-roles";
import type { Track, TrackCredit } from "../types";
import type { TidalTrackCredits } from "./credits-page";
import { isTidalCreditsResult } from "./credits-page";

function reference(url: string) {
	const parsed = new URL(url);
	const match = /^\/album\/(\d+)\/track\/(\d+)$/.exec(parsed.pathname);
	if (
		parsed.origin !== "https://tidal.com" ||
		parsed.username ||
		parsed.password ||
		!match
	) {
		throw new Error("Unsupported Tidal song credits URL");
	}
	return { albumId: match[1], trackId: match[2] };
}

export function createSongCreditsResolver(
	isActive: () => boolean,
	tracks: Track[],
) {
	const albums = new Map<string, Promise<TidalTrackCredits[]>>();
	const artistNames = new Map(
		tracks.flatMap((track) =>
			(track.artists ?? []).map((name): [string, string] => [
				name.toLowerCase(),
				name,
			]),
		),
	);
	return async (url: string): Promise<TrackCredit[]> => {
		const { albumId, trackId } = reference(url);
		if (!isActive()) throw new Error("Tidal credit loading cancelled");
		let pending = albums.get(albumId);
		if (!pending) {
			const trackIds = new Set(
				tracks.flatMap((track) => {
					if (track.header || !track.creditsUrl) return [];
					const parsed = new URL(track.creditsUrl);
					if (parsed.origin !== "https://tidal.com") return [];
					const item = reference(track.creditsUrl);
					return item.albumId === albumId ? [item.trackId] : [];
				}),
			);
			trackIds.add(trackId);
			pending = sendBackgroundMessage<
				TidalCreditsRequest,
				TidalCreditsResponse
			>({
				type: "tidalCredits",
				data: { albumId, trackIds: [...trackIds] },
			}).then(({ data }) => {
				if (!isTidalCreditsResult(data))
					throw new Error("Invalid Tidal credits response");
				if ("error" in data) throw new Error(data.error);
				return data.tracks;
			});
			albums.set(albumId, pending);
		}
		const credits = (await pending).find(
			(track) => track.id === trackId,
		)?.credits;
		if (!credits) throw new Error(`Missing Tidal credits for track ${trackId}`);
		const normalized = credits.map(({ name, role }) => ({
			name: artistNames.get(name.toLowerCase()) ?? name,
			role: normalizeCreditRole(role),
		}));
		return [
			...new Map(
				normalized.map((credit) => [
					JSON.stringify([credit.name, credit.role]),
					credit,
				]),
			).values(),
		];
	};
}
