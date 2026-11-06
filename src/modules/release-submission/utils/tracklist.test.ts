import { expect, test } from "vitest";

import { convertTracklistCase } from "./tracklist";

test.each([
	["the sound of music", "The Sound of Music"],
	["[b]the sound of music[/b]", "[b]The Sound of Music[/b]"],
	["[]the sound of music[]", "[]The Sound of Music[]"],
	["[keep [nested] the sound of music", "[keep [nested] The Sound of Music"],
	["[[[keep] the sound of music", "[[[keep] The Sound of Music"],
	["[keep][also keep] the sound", "[keep][also keep] The Sound"],
	["[keep] the sound [unfinished", "[keep] The Sound [Unfinished"],
	["the sound ] [unfinished", "The Sound ] [Unfinished"],
	["the sound [", "The Sound ["],
	["[untitled]", "[untitled]"],
	["", ""],
])("preserves bracket matching when converting %j", (title, expected) => {
	expect(convertTracklistCase(`A1|${title}|03:42|extra`, "title-case")).toBe(
		`A1|${expected}|03:42|extra`,
	);
});

test("preserves linked artist prefixes and formatting in sentence case", () => {
	expect(
		convertTracklistCase(
			"1|[Artist123,AC/DC] & [Artist456] - [b]THE SOUND OF MUSIC[/b]|4:05",
			"sentence-case",
		),
	).toBe("1|[Artist123,AC/DC] & [Artist456] - [b]The sound of music[/b]|4:05");
});

test("handles many unmatched opening brackets without changing their text", () => {
	const brackets = "[".repeat(2_000);
	expect(
		convertTracklistCase(`1|${brackets}the sound of music|`, "title-case"),
	).toBe(`1|${brackets}The Sound of Music|`);
});
