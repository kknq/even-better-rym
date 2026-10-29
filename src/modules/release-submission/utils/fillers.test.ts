import { describe, expect, test } from "vitest";

import type { Track } from "~/shared/services/types";

import { getSuggestedCredits } from "./suggested-credits";
import { formatTracks, getTrackDurations } from "./tracklist";

const tracks: Track[] = [
	{ position: "1", title: "first track", duration: "3:10" },
	{ position: "2", title: "second track", duration: "4:20" },
];

describe("formatTracks", () => {
	test.each([
		["Song (feat. Guest)", "Song"],
		["Song [feat. Guest]", "Song"],
		["Song (FEAT Guest)", "Song"],
		["Song [featuring Guest]", "Song"],
		["Song (feat. A) [feat. B]", "Song"],
		["Song ( feat. Guest ) (Live)", "Song (Live)"],
		["Song (feat. Guest) Part II", "Song Part II"],
		["Song (Live) [Remix]", "Song (Live) [Remix]"],
		["  Song (Live)  ", "  Song (Live)  "],
		["Song feat. Guest", "Song feat. Guest"],
		["Song (feat. Guest", "Song (feat. Guest"],
		["untitled (feat. Guest)", "[untitled]"],
		["Song (Bonus Track) [feat. Guest]", "Song [bonus track]"],
	])("removes only bracketed feature annotations: %s", (title, expected) => {
		expect(
			formatTracks([{ position: "A1", title, duration: "3:10" }], "as-is"),
		).toBe(`A1|${expected}|3:10`);
	});

	test("keeps the original feature metadata available for suggested credits", () => {
		const imported: Track[] = [
			{ position: "1", title: "Song [feat. Guest]", duration: "3:10" },
			{ position: "2", title: "Other", duration: "4:20" },
		];
		expect(formatTracks(imported, "as-is", ["2:45", "5:00"])).toBe(
			"1|Song|2:45\n2|Other|5:00",
		);
		expect(imported[0]?.title).toBe("Song [feat. Guest]");
		expect(getSuggestedCredits(imported)).toEqual([
			{
				key: '["Guest","featured"]',
				name: "Guest",
				role: "featured",
				positions: ["1"],
			},
		]);
	});

	test("leaves feature annotations in section headings alone", () => {
		expect(
			formatTracks([{ title: "Section (feat. Guest)", header: true }], "as-is"),
		).toBe("1|[b]Section (feat. Guest)[/b]|");
	});

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
