import type { Track } from "~/shared/services/types";

import { ARTIST_SEPARATOR } from "./artist-shortcuts";
import { markBonusTrack } from "./bonus-track";
import type { CapitalizationType } from "./capitalization";
import { capitalize } from "./capitalization";
import { stripFeaturedArtistTags } from "./suggested-credits";
import { getTrackPosition } from "./track-position";

// Odd-indexed parts are bracketed spans, including any nested opening brackets.
function splitBracketedText(text: string): string[] {
	const parts: string[] = [];
	let cursor = 0;
	while (cursor < text.length) {
		const start = text.indexOf("[", cursor);
		if (start === -1) break;
		const end = text.indexOf("]", start + 1);
		if (end === -1) break;
		parts.push(text.slice(cursor, start), text.slice(start, end + 1));
		cursor = end + 1;
	}
	parts.push(text.slice(cursor));
	return parts;
}

export function convertTracklistCase(
	text: string,
	capitalization: Exclude<CapitalizationType, "as-is">,
): string {
	return text
		.split("\n")
		.map((line) => {
			const fields = line.split("|");
			if (fields.length < 2) return line;
			const title = fields[1];
			const separatorIndex = title.indexOf(ARTIST_SEPARATOR);
			const prefix =
				separatorIndex !== -1 &&
				/\[Artist\d+(?:,[^\]]+)?]/i.test(title.slice(0, separatorIndex))
					? title.slice(0, separatorIndex + ARTIST_SEPARATOR.length)
					: "";
			const trackTitle = title.slice(prefix.length);
			const brackets = splitBracketedText(trackTitle).filter(
				(_, index) => index % 2 === 1,
			);
			fields[1] =
				prefix +
				splitBracketedText(capitalize(trackTitle, capitalization))
					.map((part, index) => {
						if (index % 2 === 0) return part;
						const original = brackets[(index - 1) / 2];
						if (original === undefined) {
							throw new Error(
								"Track title markup changed during case conversion",
							);
						}
						return original;
					})
					.join("");
			return fields.join("|");
		})
		.join("\n");
}

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
