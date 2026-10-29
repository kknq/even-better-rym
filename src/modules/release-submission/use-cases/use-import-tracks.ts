import { useSyncExternalStore } from "preact/compat";
import type { ResolveData, Track } from "~/shared/services/types";
import { loadCreditSuggestions } from "../utils/load-credit-suggestions";
import { reportSubmissionError } from "../utils/report-error";
import { getTrackCredits } from "../utils/suggested-credits";
import { hasDifferingTrackArtists } from "../utils/track-artist-links";
import type { ReleaseOptions } from "../utils/types";
import type { ImportSession } from "./use-import-session";

export type TrackSession = {
	data: ResolveData;
	options: ReleaseOptions;
	tracks: Track[];
	loading: boolean;
	progress: { completed: number; total: number };
	error?: string;
};

let snapshot: ImportSession<TrackSession> = { count: 0, session: undefined };
let generation = 0;
const listeners = new Set<() => void>();

const publish = (next: ImportSession<TrackSession>) => {
	snapshot = next;
	for (const listener of listeners) listener();
};

const reset = () => {
	generation += 1;
	publish({ count: snapshot.count + 1, session: undefined });
};

function complete(
	event: CustomEvent<{ data: ResolveData; options: ReleaseOptions }>,
) {
	const current = ++generation;
	const { data, options } = event.detail;
	const tracks = data.tracks ?? [];
	const hasSuggestions = tracks.some(
		(track) =>
			!track.header &&
			(Boolean(track.creditsUrl) || getTrackCredits(track).length > 0),
	);
	const loading =
		options.fillFields.tracks &&
		hasSuggestions &&
		(Boolean(options.fillFields.credits) ||
			(hasDifferingTrackArtists(tracks, data.artists ?? []) &&
				tracks.some((track) => !track.header && Boolean(track.creditsUrl))));
	publish({
		count: snapshot.count + 1,
		session: {
			data,
			options,
			tracks,
			loading,
			progress: { completed: 0, total: 0 },
		},
	});
	if (!loading) return;
	const isActive = () => generation === current;
	void loadCreditSuggestions(tracks, {
		isActive,
		onProgress: (completed, total) => {
			if (!isActive() || !snapshot.session) return;
			publish({
				...snapshot,
				session: { ...snapshot.session, progress: { completed, total } },
			});
		},
	})
		.then((result) => {
			if (!isActive() || !snapshot.session) return;
			publish({
				...snapshot,
				session: {
					...snapshot.session,
					tracks: result.tracks,
					loading: false,
					error:
						result.failedPositions.length > 0
							? `Could not load song credits for tracks ${result.failedPositions.join(", ")}. Suggestions may be incomplete.`
							: undefined,
				},
			});
		})
		.catch((cause: unknown) => {
			reportSubmissionError(cause);
			if (!isActive() || !snapshot.session) return;
			publish({
				...snapshot,
				session: {
					...snapshot.session,
					loading: false,
					error: "Could not load song credits. Suggestions may be incomplete.",
				},
			});
		});
}

function subscribe(listener: () => void) {
	if (listeners.size === 0) {
		document.addEventListener("importEvent", reset);
		document.addEventListener("importCompleteEvent", complete);
	}
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) {
			document.removeEventListener("importEvent", reset);
			document.removeEventListener("importCompleteEvent", complete);
			generation += 1;
			snapshot = { count: 0, session: undefined };
		}
	};
}

const getSnapshot = () => snapshot;

export const useImportTracks = () =>
	useSyncExternalStore(subscribe, getSnapshot);
