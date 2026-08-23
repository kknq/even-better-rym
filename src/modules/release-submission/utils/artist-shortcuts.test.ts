import { describe, expect, test } from "vitest";

import {
	buildArtistToken,
	insertArtistShortcut,
	isTrackTitleFieldId,
} from "./artist-shortcuts";

describe("insertArtistShortcut", () => {
	const tests = [
		["Track", "[ArtistX] - Track"],
		["Artist1 - Track", "[ArtistX] - Artist1 - Track"],
		["[Artist1] - Track", "[Artist1] & [ArtistX] - Track"],
		["Artist1 & Artist2 - Track", "[ArtistX] - Artist1 & Artist2 - Track"],
		["Artist1 & [Artist2] - Track", "Artist1, [Artist2] & [ArtistX] - Track"],
		["[Artist1] & Artist2 - Track", "[Artist1], Artist2 & [ArtistX] - Track"],
		[
			"[Artist1] & [Artist2] - Track",
			"[Artist1], [Artist2] & [ArtistX] - Track",
		],
	] as const;

	test.each(tests)("%s -> %s", (input, output) =>
		expect(insertArtistShortcut(input, "[ArtistX]")).toBe(output));

	test("does not misparse a track name containing its own separator", () => {
		// no [ArtistXXXX] link before the first " - ", so the whole field
		// is kept intact as the track name rather than being split apart
		expect(
			insertArtistShortcut("A-Ha - Take On Me - 12in Mix", "[ArtistX]"),
		).toBe("[ArtistX] - A-Ha - Take On Me - 12in Mix");
	});
});

describe("buildArtistToken", () => {
	test("without custom text", () => {
		expect(buildArtistToken("1566274")).toBe("[Artist1566274]");
	});

	test("with custom text", () => {
		expect(buildArtistToken("1566274", "custom")).toBe(
			"[Artist1566274,custom]",
		);
	});
});

describe("isTrackTitleFieldId", () => {
	test.each([
		["track_track_title1", true],
		["track_track_title12", true],
		["track_title", false],
		["va_labels", false],
		["track_advanced", false],
	])("%s -> %s", (id, expected) => {
		expect(isTrackTitleFieldId(id)).toBe(expected);
	});
});
