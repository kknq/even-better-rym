import { expect, test } from "vitest";
import type { TrackItem } from "./codec";
import { getDiscogsCredits } from "./credits";

const tracklist: TrackItem[] = [
	{ position: "", title: "Side A", type_: "heading" },
	{
		position: "A1",
		title: "First Song",
		type_: "track",
		extraartists: [
			{
				name: "Legal Name",
				anv: "Credited Name",
				role: "Written-By, Producer",
			},
		],
	},
	{ position: "A2", title: "Second Song", type_: "track" },
	{ position: "A3", title: "Third Song", type_: "track" },
	{ position: "", title: "Side B", type_: "heading" },
	{ position: "B1", title: "Fourth Song", type_: "track" },
];

test("applies release credits to explicit positions and treats blank scope as whole release", () => {
	const { trackCredits, unverifiedCredits } = getDiscogsCredits(tracklist, [
		{
			name: "Engineer",
			role: "Engineer [Recording Engineer, Mixing Engineer], Producer",
			tracks: "A1, A3 to B1",
		},
		{ name: "Unspecified", role: "Producer" },
		{ name: "Artwork", role: "Design", tracks: "" },
	]);

	expect(trackCredits).toEqual([
		[],
		[
			{ name: "Credited Name", role: "writer" },
			{ name: "Credited Name", role: "producer" },
			{
				name: "Engineer",
				role: "engineer [recording engineer, mixing engineer]",
			},
			{ name: "Engineer", role: "producer" },
			{ name: "Unspecified", role: "producer" },
			{ name: "Artwork", role: "design" },
		],
		[
			{ name: "Unspecified", role: "producer" },
			{ name: "Artwork", role: "design" },
		],
		[
			{
				name: "Engineer",
				role: "engineer [recording engineer, mixing engineer]",
			},
			{ name: "Engineer", role: "producer" },
			{ name: "Unspecified", role: "producer" },
			{ name: "Artwork", role: "design" },
		],
		[],
		[
			{
				name: "Engineer",
				role: "engineer [recording engineer, mixing engineer]",
			},
			{ name: "Engineer", role: "producer" },
			{ name: "Unspecified", role: "producer" },
			{ name: "Artwork", role: "design" },
		],
	]);
	expect(unverifiedCredits).toEqual([]);
});

test("retains invalid explicit scopes for review while applying blank scope album-wide", () => {
	const tracksWithoutLocalCredits = tracklist.map((track) => ({
		...track,
		extraartists: undefined,
	}));
	const { trackCredits, unverifiedCredits } = getDiscogsCredits(
		tracksWithoutLocalCredits,
		[
			{ name: "Missing", role: "Producer", tracks: "A1, C1" },
			{ name: "Reversed", role: "Producer", tracks: "A3 to A1" },
			{ name: "Blank", role: "Producer", tracks: " " },
		],
	);

	expect(trackCredits).toEqual([
		[],
		[{ name: "Blank", role: "producer" }],
		[{ name: "Blank", role: "producer" }],
		[{ name: "Blank", role: "producer" }],
		[],
		[{ name: "Blank", role: "producer" }],
	]);
	expect(unverifiedCredits).toEqual([
		{ name: "Missing", role: "producer" },
		{ name: "Reversed", role: "producer" },
	]);
});

test("maps lacquer-cut credits with blank scope to the entire album", () => {
	const { trackCredits, unverifiedCredits } = getDiscogsCredits(tracklist, [
		{ name: "JN-H", role: "Lacquer Cut By", tracks: "" },
	]);

	expect(trackCredits).toEqual([
		[],
		[
			{ name: "Credited Name", role: "writer" },
			{ name: "Credited Name", role: "producer" },
			{ name: "JN-H", role: "lacquer cut" },
		],
		[{ name: "JN-H", role: "lacquer cut" }],
		[{ name: "JN-H", role: "lacquer cut" }],
		[],
		[{ name: "JN-H", role: "lacquer cut" }],
	]);
	expect(unverifiedCredits).toEqual([]);
});

test("retains credits for duplicate source positions for review", () => {
	const duplicated = [
		...tracklist.map((track) => ({ ...track, extraartists: undefined })),
		{ position: "A3", title: "Duplicate Position", type_: "track" as const },
	];
	const { trackCredits, unverifiedCredits } = getDiscogsCredits(duplicated, [
		{ name: "Ambiguous", role: "Producer", tracks: "A3" },
		{ name: "Ambiguous Range", role: "Producer", tracks: "A2 to B1" },
	]);

	expect(trackCredits.every((credits) => credits.length === 0)).toBe(true);
	expect(unverifiedCredits).toEqual([
		{ name: "Ambiguous", role: "producer" },
		{ name: "Ambiguous Range", role: "producer" },
	]);
});

test("deduplicates equivalent track-local and explicit release credits", () => {
	const { trackCredits, unverifiedCredits } = getDiscogsCredits(
		[
			{
				position: "1",
				title: "Song",
				type_: "track",
				extraartists: [{ name: "Mixer", role: "Mixed By" }],
			},
		],
		[{ name: "Mixer", role: "Mixing Engineer", tracks: "1" }],
	);

	expect(trackCredits).toEqual([[{ name: "Mixer", role: "mixing engineer" }]]);
	expect(unverifiedCredits).toEqual([]);
});

test("preserves unmapped source roles in lowercase with their original scope", () => {
	const { trackCredits, unverifiedCredits } = getDiscogsCredits(
		[
			{
				position: "1",
				title: "Song",
				type_: "track",
				extraartists: [{ name: "Art Worker", role: "Cover Art" }],
			},
		],
		[{ name: "Art Worker", role: "Cover Art", tracks: "unknown" }],
	);

	expect(trackCredits).toEqual([[{ name: "Art Worker", role: "cover art" }]]);
	expect(unverifiedCredits).toEqual([
		{ name: "Art Worker", role: "cover art" },
	]);
});

test("retains credits with missing or empty roles as unverified names", () => {
	const { trackCredits, unverifiedCredits } = getDiscogsCredits(
		[
			{
				position: "1",
				title: "Song",
				type_: "track",
				extraartists: [
					{ name: "Missing Role" },
					{ name: "Empty Role", role: "" },
				],
			},
		],
		[
			{ name: "Missing Role", tracks: "1" },
			{ name: "Empty Role", role: "", tracks: "1" },
		],
	);

	expect(trackCredits).toEqual([[]]);
	expect(unverifiedCredits).toEqual([
		{ name: "Missing Role" },
		{ name: "Empty Role" },
	]);
});

test("rejects malformed expected credit data", () => {
	expect(() =>
		getDiscogsCredits(tracklist, [{ name: "Person", role: "Engineer [" }]),
	).toThrow("Malformed Discogs credit role");
	expect(() =>
		getDiscogsCredits(tracklist, [{ name: "Person", role: "Producer" }, null]),
	).toThrow("Malformed Discogs extra artist");
});
