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

	test("excludes title-featured artists but keeps other guests on the same tracks", () => {
		const tracks = [
			{
				position: "2",
				title: "Go2DaMoon (feat. Kanye West)",
				artists: ["Playboi Carti", "Kanye West", "Other Guest"],
			},
			{
				position: "6",
				title: "M3tamorphosis [feat. Kid Cudi]",
				artists: ["Playboi Carti", "Kid Cudi"],
			},
			{
				position: "10",
				title: "Teen X (feat. Future)",
				artists: ["Playboi Carti", "Future"],
			},
		];
		expect(getGuestArtists(tracks, ["Playboi Carti"])).toEqual([
			{ name: "Other Guest", positions: ["2"] },
		]);
	});

	test("subtracts only the featured tracks, keeping the artist's remaining guest scope", () => {
		const tracks = [
			{
				position: "A1",
				title: "One",
				artists: ["Guest"],
				credits: [{ name: "Guest", role: "featured" }],
			},
			{
				position: "A2",
				title: "Two",
				artists: ["Guest"],
				credits: [{ name: "Guest", role: "producer" }],
			},
			{ position: "B1", title: "Three (feat. Guest)", artists: ["Guest"] },
			{ position: "B2", title: "Four", artists: ["Guest"] },
		];
		const original = JSON.stringify(tracks);
		expect(getGuestArtists(tracks, ["Main"])).toEqual([
			{ name: "Guest", positions: ["A2", "B2"] },
		]);
		expect(JSON.stringify(tracks)).toBe(original);
	});

	test("omits a person featured on every track rather than treating blank featured scope as no overlap", () => {
		expect(
			getGuestArtists(
				[
					{
						artists: ["Guest"],
						credits: [{ name: "Guest", role: "featured" }],
					},
					{
						artists: ["Guest"],
						credits: [{ name: "Guest", role: "featured" }],
					},
				],
				["Main"],
			),
		).toEqual([]);
	});

	test("matches normalized feature names and preserves known artist names containing separators", () => {
		expect(
			getGuestArtists(
				[
					{
						title: "Song [featuring Simon & Garfunkel]",
						artists: ["Simon & Garfunkel"],
					},
					{
						artists: ["beyonce"],
						credits: [{ name: " Beyoncé ", role: "featured" }],
					},
					{ title: "Song (feat. FUTURE)", artists: ["Future"] },
				],
				["Main"],
			),
		).toEqual([]);
	});

	test("compares actual tracks rather than deleting every occurrence of a featured position", () => {
		expect(
			getGuestArtists(
				[
					{
						position: "1",
						artists: ["Guest"],
						credits: [{ name: "Guest", role: "featured" }],
					},
					{ position: "1", artists: ["Guest"] },
					{
						header: true,
						position: "2",
						artists: ["Guest"],
						title: "Disc (feat. Guest)",
					},
					{ position: "3", artists: ["Guest"] },
				],
				["Main"],
			),
		).toEqual([{ name: "Guest", positions: ["1", "3"] }]);
	});
});

describe("formatCreditTracks", () => {
	test("separates positions with a comma and a space", () => {
		expect(formatCreditTracks(["2", "12"])).toBe("2, 12");
	});

	test.each([
		{ positions: [], expected: "" },
		{ positions: ["1"], expected: "1" },
		{ positions: ["1", "2"], expected: "1, 2" },
		{ positions: ["1", "2", "3"], expected: "1-3" },
		{
			positions: [
				"1",
				"2",
				"3",
				"4",
				"6",
				"7",
				"8",
				"9",
				"11",
				"12",
				"14",
				"15",
				"16",
				"17",
				"19",
				"20",
				"22",
				"23",
				"24",
			],
			expected: "1-4, 6-9, 11, 12, 14-17, 19, 20, 22-24",
		},
		{ positions: ["9", "10", "11", "14"], expected: "9-11, 14" },
		{ positions: ["1", "3", "4", "5"], expected: "1, 3-5" },
		{ positions: ["3", "2", "1"], expected: "3, 2, 1" },
		{ positions: ["1", "1", "2"], expected: "1, 1, 2" },
		{ positions: ["01", "02", "03"], expected: "01, 02, 03" },
		{ positions: ["A1", "A2", "A3", "B1"], expected: "A1-A3, B1" },
		{
			positions: ["A1", "A2", "A3", "A4", "B1", "B3", "B4"],
			expected: "A1-A4, B1, B3, B4",
		},
		{ positions: ["A1", "A2", "B3", "B4", "B5"], expected: "A1, A2, B3-B5" },
		{ positions: ["A9", "A10", "A11"], expected: "A9-A11" },
		{ positions: ["A3", "A2", "A1"], expected: "A3, A2, A1" },
		{ positions: ["A01", "A02", "A03"], expected: "A01, A02, A03" },
		{ positions: ["A1", "B2", "C3"], expected: "A1, B2, C3" },
		{ positions: ["1.1", "1.2", "1.3", "2.1"], expected: "1.1, 1.2, 1.3, 2.1" },
		{ positions: ["1", "2", "A1", "3", "4", "5"], expected: "1, 2, A1, 3-5" },
	])("formats $positions as $expected without changing the source", ({
		positions,
		expected,
	}) => {
		const original = [...positions];
		expect(formatCreditTracks(positions)).toBe(expected);
		expect(positions).toEqual(original);
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
		expect(
			describeGuestChoice(guest, {
				kind: "text",
				name: guest.name,
				line: "3",
			}),
		).toBe("credited by name (tracks 2, 12)");
		expect(
			describeGuestChoice(guest, {
				kind: "linked",
				token: "[Artist5]",
				line: "3",
			}),
		).toBe("[Artist5] as guest (tracks 2, 12)");
	});
});
