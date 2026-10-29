import type { Track } from "~/shared/services/types";

export const getTrackPosition = (track: Track, index: number): string =>
	String(track.position ?? index + 1).trim();
