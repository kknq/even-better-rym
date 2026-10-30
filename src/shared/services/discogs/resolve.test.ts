import { beforeEach, expect, test, vi } from "vitest";
import { getSuggestedCredits } from "~/modules/release-submission/utils/suggested-credits";
import { fetch } from "~/shared/utils/fetch";
import { resolve } from "./resolve";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));

const release = {
	uri: "https://www.discogs.com/release/123-Example",
	title: "Example Album",
	artists: [{ name: "Main Artist", id: 1 }],
	extraartists: [
		{ name: "Mix Engineer", role: "Mixed By", tracks: "A1, A3 to B1" },
		{ name: "Release Designer", role: "Artwork", tracks: "" },
		{ name: "Unspecified Person", role: "Producer" },
	],
	tracklist: [
		{ position: "", title: "Side A", duration: "", type_: "heading" },
		{
			position: "A1",
			title: "First Song",
			duration: "3:00",
			type_: "track",
			artists: [{ name: "Main Artist", id: 1 }],
			extraartists: [
				{ name: "Writer", anv: "Credited Writer", role: "Written-By" },
			],
		},
		{ position: "A2", title: "Second Song", duration: "4:00", type_: "track" },
		{ position: "A3", title: "Third Song", duration: "5:00", type_: "track" },
		{ position: "", title: "Side B", duration: "", type_: "heading" },
		{ position: "B1", title: "Fourth Song", duration: "6:00", type_: "track" },
	],
	images: [],
	formats: [],
	labels: [{ name: "Test Label", catno: "TEST-1" }],
	released: "2025-01-02",
	country: "US",
};

beforeEach(() => {
	vi.mocked(fetch).mockReset().mockResolvedValue(JSON.stringify(release));
});

test("imports track-local, explicitly scoped, and album-wide release credits", async () => {
	const result = await resolve("https://www.discogs.com/release/123-Example");

	expect(result.tracks).toEqual([
		{
			position: "",
			title: "Side A",
			duration: "",
			header: true,
		},
		{
			position: "A1",
			title: "First Song",
			duration: "3:00",
			header: false,
			artists: ["Main Artist"],
			credits: [
				{ name: "Credited Writer", role: "writer" },
				{ name: "Mix Engineer", role: "mixing engineer" },
				{ name: "Release Designer", role: "artwork" },
				{ name: "Unspecified Person", role: "producer" },
			],
		},
		{
			position: "A2",
			title: "Second Song",
			duration: "4:00",
			header: false,
			credits: [
				{ name: "Release Designer", role: "artwork" },
				{ name: "Unspecified Person", role: "producer" },
			],
		},
		{
			position: "A3",
			title: "Third Song",
			duration: "5:00",
			header: false,
			credits: [
				{ name: "Mix Engineer", role: "mixing engineer" },
				{ name: "Release Designer", role: "artwork" },
				{ name: "Unspecified Person", role: "producer" },
			],
		},
		{
			position: "",
			title: "Side B",
			duration: "",
			header: true,
		},
		{
			position: "B1",
			title: "Fourth Song",
			duration: "6:00",
			header: false,
			credits: [
				{ name: "Mix Engineer", role: "mixing engineer" },
				{ name: "Release Designer", role: "artwork" },
				{ name: "Unspecified Person", role: "producer" },
			],
		},
	]);
	const suggestions = getSuggestedCredits(result.tracks ?? []);
	expect(suggestions).toContainEqual(
		expect.objectContaining({
			name: "Credited Writer",
			role: "writer",
			positions: ["A1"],
		}),
	);
	expect(suggestions).toContainEqual(
		expect.objectContaining({
			name: "Mix Engineer",
			role: "mixing engineer",
			positions: ["A1", "A3", "B1"],
		}),
	);
	expect(suggestions).toContainEqual(
		expect.objectContaining({
			name: "Unspecified Person",
			role: "producer",
			positions: [],
		}),
	);
	expect(suggestions).toContainEqual(
		expect.objectContaining({
			name: "Release Designer",
			role: "artwork",
			positions: [],
		}),
	);
	expect(result.unverifiedCredits).toBeUndefined();
	expect(fetch).toHaveBeenCalledOnce();
});

test("retains track artists as attribution rather than turning them into credits", async () => {
	vi.mocked(fetch).mockResolvedValueOnce(
		JSON.stringify({
			...release,
			extraartists: [],
			tracklist: [
				{
					position: "1",
					title: "Song",
					duration: "3:00",
					type_: "track",
					artists: [{ name: "Guest", anv: "Guest Alias", id: 2 }],
					extraartists: [],
				},
			],
		}),
	);
	const result = await resolve("https://www.discogs.com/release/123-Example");

	expect(result.tracks?.[0]?.artists).toEqual(["Guest Alias"]);
	expect(result.tracks?.[0]?.credits).toBeUndefined();
	expect(getSuggestedCredits(result.tracks ?? [])).toEqual([]);
});

test("preserves Signalis rose-engine artwork credit as an album-wide lowercase suggestion", async () => {
	vi.mocked(fetch).mockResolvedValueOnce(
		JSON.stringify({
			...release,
			extraartists: [
				{ name: "rose-engine", anv: "", role: "Artwork By", tracks: "", id: 0 },
			],
		}),
	);
	const result = await resolve("https://www.discogs.com/release/29266051");
	expect(getSuggestedCredits(result.tracks ?? [])).toContainEqual(
		expect.objectContaining({
			name: "rose-engine",
			role: "artwork",
			positions: [],
		}),
	);
	expect(result.unverifiedCredits).toBeUndefined();
});

test("strips trailing Discogs artist disambiguators from names and credits", async () => {
	vi.mocked(fetch).mockResolvedValueOnce(
		JSON.stringify({
			...release,
			artists: [{ name: "Starboy (6)", id: 100 }],
			extraartists: [],
			tracklist: [
				{
					position: "1",
					title: "Song",
					type_: "track",
					artists: [
						{ name: "Ken Carson (2)", id: 101 },
						{ name: "Band (Live)", id: 102 },
					],
					extraartists: [
						{ name: "Future (3)", anv: "Future (4)", role: "Producer" },
					],
				},
			],
		}),
	);

	const result = await resolve("https://www.discogs.com/release/123-Example");

	expect(result.artists).toEqual(["Starboy"]);
	expect(result.tracks?.[0]?.artists).toEqual(["Ken Carson", "Band (Live)"]);
	expect(result.tracks?.[0]?.credits).toEqual([
		{ name: "Future", role: "producer" },
	]);
});

test("combines labels into an unselected RYM search phrase", async () => {
	vi.mocked(fetch).mockResolvedValueOnce(
		JSON.stringify({
			...release,
			labels: [
				{
					name: "Interscope Records",
					catno: "B0033513-01",
					id: 2311,
				},
				{ name: "AWGE", catno: "B0033513-01", id: 1210365 },
			],
		}),
	);

	const result = await resolve("https://www.discogs.com/release/123-Example");

	expect(result.label).toEqual({
		name: "AWGE / Interscope Records",
		catno: "B0033513-01",
	});
});

test("suggests track-local and whole-release credits from Whole Lotta Red source data", async () => {
	const wholeLottaRed = {
		...release,
		title: "Whole Lotta Red",
		extraartists: [
			{
				name: "Joe Nino-Hernes",
				anv: "JN-H",
				role: "Lacquer Cut By",
				tracks: "",
			},
		],
		tracklist: [
			{
				position: "1",
				title: "Rockstar Made",
				type_: "track" as const,
				extraartists: [
					{ name: "F1LTHY", role: "Producer" },
					{ name: "Jonah Abraham", role: "Producer" },
				],
			},
			{
				position: "2",
				title: "Go2DaMoon",
				type_: "track" as const,
				extraartists: [
					{ name: "Kanye West", role: "Featuring" },
					{ name: "Outtatown", role: "Producer" },
				],
			},
		],
	};
	vi.mocked(fetch).mockResolvedValueOnce(JSON.stringify(wholeLottaRed));

	const result = await resolve("https://www.discogs.com/release/19979083");

	expect(result.tracks).toHaveLength(2);
	expect(getSuggestedCredits(result.tracks ?? [])).toMatchObject([
		{ name: "F1LTHY", role: "producer", positions: ["1"] },
		{ name: "Jonah Abraham", role: "producer", positions: ["1"] },
		{ name: "JN-H", role: "lacquer cut", positions: [] },
		{ name: "Kanye West", role: "featured", positions: ["2"] },
		{ name: "Outtatown", role: "producer", positions: ["2"] },
	]);
});

test("keeps the existing master-to-primary-release lookup", async () => {
	vi.mocked(fetch)
		.mockResolvedValueOnce(JSON.stringify({ main_release: 123 }))
		.mockResolvedValueOnce(JSON.stringify(release));

	await resolve("https://www.discogs.com/master/456-Example");

	expect(fetch).toHaveBeenNthCalledWith(
		1,
		expect.objectContaining({ url: "https://api.discogs.com/masters/456" }),
	);
	expect(fetch).toHaveBeenNthCalledWith(
		2,
		expect.objectContaining({ url: "https://api.discogs.com/releases/123" }),
	);
});
