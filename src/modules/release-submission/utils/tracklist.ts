import type { Track } from "~/shared/services/types";

import { markBonusTrack } from "./bonus-track";
import type { CapitalizationType } from "./capitalization";
import { capitalize } from "./capitalization";
import { stripFeaturedArtistTags } from "./suggested-credits";
import { getTrackPosition } from "./track-position";

export function formatTracks(
	tracks: Track[],
	capitalization: CapitalizationType,
	existingDurations?: string[],
) {
	return tracks
		.map((track, index) => {
			const position = getTrackPosition(track, index);

			let title = track.title ?? "";
			if (!track.header) title = stripFeaturedArtistTags(title);

			title =
				title.toLowerCase() === "untitled"
					? "[untitled]"
					: capitalize(title, capitalization);
			if (!track.header) title = markBonusTrack(title);

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
