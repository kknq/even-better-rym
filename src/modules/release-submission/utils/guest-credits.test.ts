import { describe, expect, test } from "vitest";

import {
	describeGuestChoice,
	formatCreditTracks,
	getGuestArtists,
} from "./guest-credits";

describe("getGuestArtists", () => {
	test("collects each non-release artist with their tracks", () => {
		const tracks = [
			{ position: "1" },
			{ position: "2", artists: ["A", "Sharm"] },
			{ position: "3", artists: ["A", "C"] },
			{ position: "12", artists: ["A", "Sharm"] },
		];

		expect(getGuestArtists(tracks, ["A"])).toEqual([
			{ name: "Sharm", positions: ["2", "12"] },
			{ name: "C", positions: ["3"] },
		]);
	});

	test("finds no guests when every track artist is a release artist", () => {
		const tracks = [{ position: "1", artists: ["A", "B"] }, { position: "2" }];

		expect(getGuestArtists(tracks, ["A", "B"])).toEqual([]);
	});

	test("lists a repeated position once and fills missing positions like the tracklist", () => {
		const tracks = [
			{ position: " 1 ", artists: ["G"] },
			{ position: "1", artists: ["G"] },
			{ artists: ["G"] },
		];

		expect(getGuestArtists(tracks, ["A"])).toEqual([
			{ name: "G", positions: ["1", "3"] },
		]);
	});
});

describe("formatCreditTracks", () => {
	test("separates positions with a comma and a space", () => {
		expect(formatCreditTracks(["2", "12"])).toBe("2, 12");
	});
});

describe("describeGuestChoice", () => {
	const guest = { name: "Sharm", positions: ["2", "12"] };

	test("describes each choice with the guest's tracks", () => {
		expect(describeGuestChoice(guest, undefined)).toBe(
			"not chosen yet (tracks 2, 12)",
		);
		expect(describeGuestChoice(guest, { kind: "skipped" })).toBe(
			"not credited (tracks 2, 12)",
		);
		expect(describeGuestChoice(guest, { kind: "text", line: "3" })).toBe(
			"credited by name (tracks 2, 12)",
		);
		expect(
			describeGuestChoice(guest, {
				kind: "linked",
				token: "[Artist5]",
				line: "3",
			}),
		).toBe("[Artist5] as guest (tracks 2, 12)");
	});
});
