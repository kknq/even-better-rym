import { describe, expect, test } from "vitest";

import type { Track } from "~/shared/services/types";

import { formatTracks, getTrackDurations } from "./tracklist";

const tracks: Track[] = [
	{ position: "1", title: "first track", duration: "3:10" },
	{ position: "2", title: "second track", duration: "4:20" },
];

describe("formatTracks", () => {
	test("uses imported track durations by default", () => {
		expect(formatTracks(tracks, "as-is")).toBe(
			"1|first track|3:10\n2|second track|4:20",
		);
	});

	test("preserves existing durations when supplied", () => {
		const existingDurations = getTrackDurations(
			"1|old first track|2:45\n2|old second track|5:00",
		);

		expect(formatTracks(tracks, "as-is", existingDurations)).toBe(
			"1|first track|2:45\n2|second track|5:00",
		);
	});
});
