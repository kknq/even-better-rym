import { describe, expect, test } from "vitest";

import { convertAppleMusicDuration } from "./convert";
import { extractTrackArtists, TRACK_NUMBER_REGEX } from "./track-artists";

describe("convertAppleMusicDuration", () => {
	const cases = [
		["PT3M14S", "3:14"],
		["PT3M", "3:00"],
		["PT14S", "0:14"],
	];

	test.each(cases)("converts %s to %s", (input, output) => {
		expect(convertAppleMusicDuration(input)).toEqual(output);
	});
});

describe("extractTrackArtists", () => {
	test("extracts the artist within the track's own object", () => {
		const scriptText =
			'{"trackNumber":1,"subtitleLinks":[{"title":"Artist A"}],"other":"x"},' +
			'{"trackNumber":2,"subtitleLinks":[{"title":"Artist B"}],"other":"y"}';
		const matches = [...scriptText.matchAll(TRACK_NUMBER_REGEX)];

		expect(extractTrackArtists(scriptText, matches[0])).toEqual(["Artist A"]);
		expect(extractTrackArtists(scriptText, matches[1])).toEqual(["Artist B"]);
	});

	test("handles nested objects between trackNumber and subtitleLinks", () => {
		const scriptText =
			'{"trackNumber":1,"contentDescriptor":{"kind":"song","identifiers":' +
			'{"storeAdamID":"1"}},"subtitleLinks":[{"title":"Artist A"}]}';
		const [match] = scriptText.matchAll(TRACK_NUMBER_REGEX);

		expect(extractTrackArtists(scriptText, match)).toEqual(["Artist A"]);
	});

	test("does not leak into unrelated content when a track has no subtitleLinks", () => {
		// Regression: the final track had "subtitleLinks":null with no next
		// trackNumber to bound the search, so the old lazy-match regex matched an
		// unrelated "subtitleLinks" entry from a later section of the script
		// instead of correctly finding nothing.
		const scriptText =
			'{"trackNumber":1,"subtitleLinks":[{"title":"Artist A"}]},' +
			'{"trackNumber":2,"subtitleLinks":null},' +
			'"recommendations":{"subtitleLinks":[{"title":"2020"}]}';
		const matches = [...scriptText.matchAll(TRACK_NUMBER_REGEX)];

		expect(extractTrackArtists(scriptText, matches[0])).toEqual(["Artist A"]);
		expect(extractTrackArtists(scriptText, matches[1])).toEqual([]);
	});
	test("returns every distinct artist when a track has several", () => {
		const scriptText =
			'{"trackNumber":17,"subtitleLinks":[' +
			'{"title":"Parallx","segue":{"destination":{"contentDescriptor":' +
			'{"kind":"artist","identifiers":{"storeAdamID":"961290429"}}}}},' +
			'{"title":"NENDZA","segue":{"destination":{"contentDescriptor":' +
			'{"kind":"artist","identifiers":{"storeAdamID":"1198760356"}}}}}' +
			'],"artistName":"Parallx & NENDZA"}';
		const [match] = scriptText.matchAll(TRACK_NUMBER_REGEX);

		expect(extractTrackArtists(scriptText, match)).toEqual([
			"Parallx",
			"NENDZA",
		]);
	});

	test("keeps an artist name containing brackets or an ampersand whole", () => {
		const scriptText =
			'{"trackNumber":1,"subtitleLinks":[{"title":"Simon & Garfunkel"},' +
			'{"title":"Odd ] Name {x}"}]}';
		const [match] = scriptText.matchAll(TRACK_NUMBER_REGEX);

		expect(extractTrackArtists(scriptText, match)).toEqual([
			"Simon & Garfunkel",
			"Odd ] Name {x}",
		]);
	});
});
