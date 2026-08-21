import type { Track } from "~/shared/services/types";

import type { CapitalizationType } from "./capitalization";
import { capitalize } from "./capitalization";

export function formatTracks(
	tracks: Track[],
	capitalization: CapitalizationType,
	existingDurations?: string[],
) {
	return tracks
		.map((track, index) => {
			const position = track.position ?? index + 1;

			let title = track.title ?? "";

			title =
				title.toLowerCase() === "untitled"
					? "[untitled]"
					: capitalize(title, capitalization);

			if (track.header) {
				title = `[b]${title}[/b]`;
			}

			const duration = existingDurations?.[index] ?? track.duration ?? "";

			return `${position}|${title}|${duration}`;
		})
		.join("\n");
}

export function getTrackDurations(tracklist: string) {
	return tracklist.split("\n").map((track) => track.split("|").at(-1) ?? "");
}
