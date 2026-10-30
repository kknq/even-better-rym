import { expect, test } from "vitest";
import type { Track } from "~/shared/services/types";
import {
	creditKey,
	getFeaturedArtists,
	getNonFeaturedTrackArtists,
	getSuggestedCredits,
	sortCreditsByTrackCoverage,
} from "./suggested-credits";

test("ranks name blocks by distinct songs across roles, including whole-release and repeated positions", () => {
	const tracks: Track[] = [
		{ header: true, credits: [{ name: "Header only", role: "producer" }] },
		{
			position: "1",
			credits: [
				{ name: "Alpha", role: "producer" },
				{ name: "Alpha", role: "mixing" },
				{ name: "Zulu", role: "vocals" },
				{ name: "Whole release", role: "mastering" },
			],
		},
		{
			position: "1",
			credits: [
				{ name: "Zulu", role: "producer" },
				{ name: "Whole release", role: "mastering" },
			],
		},
		{
			position: "2",
			credits: [{ name: "Whole release", role: "mastering" }],
		},
	];
	const credits = getSuggestedCredits(tracks);
	const original = JSON.stringify({ tracks, credits });
	const sorted = sortCreditsByTrackCoverage(credits, tracks);
	expect(sorted.map(({ name, role }) => [name, role])).toEqual([
		["Whole release", "mastering"],
		["Zulu", "vocals"],
		["Zulu", "producer"],
		["Alpha", "producer, mixing"],
	]);
	expect(sorted[0]?.positions).toEqual([]);
	expect(JSON.stringify({ tracks, credits })).toBe(original);
	expect(
		sortCreditsByTrackCoverage(
			[{ name: "Header only" }, { name: "Alpha" }],
			tracks,
		).map(({ name }) => name),
	).toEqual(["Alpha", "Header only"]);
});

test("counts role credits and title features once per song and keeps exact names in stable alphabetical blocks", () => {
	const credits = [
		{ name: "Zulu", role: "guest" },
		{ name: "éclair", role: "vocals" },
		{ name: "beta", role: "mixing" },
		{ name: "Alpha", role: "producer" },
		{ name: "Éclair", role: "producer" },
		{ name: "éclair", role: "producer" },
	];
	const tracks: Track[] = [
		{
			artists: ["Zulu", "Zulu", "Alpha", "beta", "éclair", "Éclair"],
			credits: [
				{ name: "Zulu", role: "producer" },
				{ name: "Zulu", role: "mixing" },
				{ name: "Alpha", role: "producer" },
				{ name: "beta", role: "mixing" },
				{ name: "éclair", role: "vocals" },
				{ name: "Éclair", role: "producer" },
			],
		},
		{ title: "Song (feat. Zulu)" },
	];
	const original = JSON.stringify({ tracks, credits });
	expect(sortCreditsByTrackCoverage(credits, tracks)).toEqual([
		credits[0],
		credits[3],
		credits[2],
		credits[1],
		credits[5],
		credits[4],
	]);
	expect(JSON.stringify({ tracks, credits })).toBe(original);
});

test("ranks Roark's whole-album credits ahead of Carti's subset role despite whole-album artist attribution", () => {
	const tracks: Track[] = Array.from({ length: 24 }, (_, index) => ({
		position: String(index + 1),
		artists: ["Playboi Carti"],
		credits: [
			{ name: "Roark Bailey", role: "mixing" },
			...(index < 12 ? [{ name: "Playboi Carti", role: "rapvocalist" }] : []),
		],
	}));
	expect(
		sortCreditsByTrackCoverage(getSuggestedCredits(tracks), tracks).map(
			({ name }) => name,
		),
	).toEqual(["Roark Bailey", "Playboi Carti"]);
});

test("guest ranking counts only eligible guest appearances, not other roles or featured appearances", () => {
	const tracks: Track[] = [
		{ artists: ["Alpha", "Zulu"] },
		{
			artists: ["Alpha", "Zulu"],
			credits: [{ name: "Alpha", role: "featured" }],
		},
		{ credits: [{ name: "Alpha", role: "producer" }] },
	];
	expect(
		sortCreditsByTrackCoverage(
			[{ name: "Alpha" }, { name: "Zulu" }],
			tracks,
			getNonFeaturedTrackArtists,
		),
	).toEqual([{ name: "Zulu" }, { name: "Alpha" }]);
});

test("track-title artists exclude title and metadata features but retain unrelated roles", () => {
	expect(
		getNonFeaturedTrackArtists({
			title: "Song [feat. Simon & Garfunkel]",
			artists: ["Main", "Simon & Garfunkel", "Future", "Other"],
			credits: [
				{ name: " FUTURE ", role: "featured" },
				{ name: "Other", role: "producer" },
			],
		}),
	).toEqual(["Main", "Other"]);
});

test("featured exclusion is per track and ignores headers", () => {
	expect(
		getNonFeaturedTrackArtists({
			artists: ["Main", "Guest"],
			credits: [{ name: "Guest", role: "featured" }],
		}),
	).toEqual(["Main"]);
	expect(
		getNonFeaturedTrackArtists({
			artists: ["Main", "Guest"],
			credits: [{ name: "Guest", role: "lyrics" }],
		}),
	).toEqual(["Main", "Guest"]);
	expect(
		getNonFeaturedTrackArtists({ header: true, artists: ["Guest"] }),
	).toEqual([]);
});

test("groups every person-role pair by track and leaves whole-release tracks blank", () => {
	const credits = getSuggestedCredits([
		{ header: true, title: "Disc 1" },
		{
			position: "A1",
			credits: [
				{ name: "Person", role: "producer" },
				{ name: "Person", role: "songwriting" },
				{ name: "Person", role: "producer" },
			],
		},
		{
			position: "B1",
			credits: [{ name: "Person", role: "producer" }],
		},
	]);
	expect(
		credits.map(({ name, role, positions }) => ({ name, role, positions })),
	).toEqual([
		{ name: "Person", role: "producer", positions: [] },
		{ name: "Person", role: "songwriting", positions: ["A1"] },
	]);
	expect(credits[0]?.key).not.toBe(credits[1]?.key);
});

test("WLR suggests Kanye West, Kid Cudi and Future as featured artists on the right tracks", () => {
	const tracks = Array.from({ length: 24 }, (_, i) => ({
		position: String(i + 1),
		title: "Track",
	}));
	tracks[1] = { position: "2", title: "Go2DaMoon (feat. Kanye West)" };
	tracks[5] = { position: "6", title: "M3tamorphosis [feat. Kid Cudi]" };
	tracks[9] = { position: "10", title: "Teen X (feat. Future)" };
	expect(
		getSuggestedCredits(tracks).map(({ name, role, positions }) => ({
			name,
			role,
			positions,
		})),
	).toEqual([
		{ name: "Kanye West", role: "featured", positions: ["2"] },
		{ name: "Kid Cudi", role: "featured", positions: ["6"] },
		{ name: "Future", role: "featured", positions: ["10"] },
	]);
});

test("finds multiple bracketed featured artists, deduplicating title and metadata credits", () => {
	expect(
		getFeaturedArtists("Track (FEAT. A & B) [featuring C] (live)"),
	).toEqual(["A", "B", "C"]);
	expect(getFeaturedArtists("Unbracketed feat. Someone")).toEqual([]);
	expect(
		getFeaturedArtists("Track (feat. Simon & Garfunkel)", [
			"Simon & Garfunkel",
		]),
	).toEqual(["Simon & Garfunkel"]);
	expect(
		getSuggestedCredits([
			{
				title: "Track (feat. A)",
				credits: [{ name: "A", role: "featured" }],
			},
		]),
	).toHaveLength(1);
});

test("uses the shared position fallback and does not mistake missing credits for all-track coverage", () => {
	const result = getSuggestedCredits([
		{ credits: [{ name: "A", role: "mixing" }] },
		{ title: "No credits" },
	]);
	expect(result[0]?.positions).toEqual(["1"]);
});

test.each([
	false,
	true,
])("combines ordinary roles with identical coverage, deduplicating roles (whole release=%s)", (wholeRelease) => {
	const credits = [
		{ name: "Person", role: "producer" },
		{ name: "Person", role: "mixing" },
	];
	const suggestions = getSuggestedCredits([
		{ header: true, title: "Disc 1" },
		{ position: "1.1", credits: [...credits, ...credits] },
		{ header: true, title: "Disc 2" },
		{ position: "2.1", credits: [...credits].reverse() },
		{
			position: "2.2",
			credits: wholeRelease ? credits : [],
		},
	]);
	expect(suggestions).toEqual([
		{
			key: creditKey("Person", "producer, mixing"),
			name: "Person",
			role: "producer, mixing",
			positions: wholeRelease ? [] : ["1.1", "2.1"],
		},
	]);
});

test("keeps roles on different tracks separate even when position labels are identical", () => {
	expect(
		getSuggestedCredits([
			{ position: "1", credits: [{ name: "Person", role: "producer" }] },
			{ position: "1", credits: [{ name: "Person", role: "mixing" }] },
			{ position: "2" },
		]).map(({ role, positions }) => ({ role, positions })),
	).toEqual([
		{ role: "producer", positions: ["1"] },
		{ role: "mixing", positions: ["1"] },
	]);
});

test("keeps artists and special roles separate despite identical coverage", () => {
	expect(
		getSuggestedCredits([
			{
				credits: [
					{ name: "Person", role: "producer" },
					{ name: "Person", role: "mixing" },
					{ name: "Person", role: "featured" },
					{ name: "Person", role: "guest" },
					{ name: "Person", role: "remixer" },
					{ name: "Other", role: "producer" },
				],
			},
		]).map(({ name, role, positions }) => ({ name, role, positions })),
	).toEqual([
		{ name: "Person", role: "producer, mixing", positions: [] },
		{ name: "Person", role: "featured", positions: [] },
		{ name: "Person", role: "guest", positions: [] },
		{ name: "Person", role: "remixer", positions: [] },
		{ name: "Other", role: "producer", positions: [] },
	]);
});
