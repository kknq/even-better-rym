// @vitest-environment jsdom

import { expect, test, vi } from "vitest";
import { fetch } from "~/shared/utils/fetch";
import { readSongCredits, resolveSongCredits } from "./credits";
import { resolve } from "./resolve";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));

// Public song-detail shape for WLR's "Rockstar Made"; no lyric content.
const sections = [
	{
		itemKind: "songDetailItemLockup",
		id: "performer",
		items: [{ name: "Playboi Carti", roleNames: ["Vocals"] }],
	},
	{
		itemKind: "songDetailItemLockup",
		id: "composer-and-lyrics",
		items: [
			{ name: "Jonah Abraham", roleNames: ["Songwriter"] },
			{ name: "Jordan Carter", roleNames: ["Songwriter"] },
		],
	},
	{
		itemKind: "songDetailItemLockup",
		id: "production-and-engineering",
		items: [
			{ name: "Jonah Abraham", roleNames: ["Producer"] },
			{ name: "Marcus Fitz", roleNames: ["Mixing Engineer", "Engineer"] },
			{ name: "Colin Leonard", roleNames: ["Mastering Engineer"] },
		],
	},
	{
		itemKind: "songDetailItemLockup",
		id: "lyric-details",
		items: [{ name: "Track title", text: "Not a credit" }],
	},
];

function documentWith(data: unknown): Document {
	return new DOMParser().parseFromString(
		`<script type="application/json">${JSON.stringify(data)}</script>`,
		"text/html",
	);
}

test("reads people and each role from public song credits, ignoring non-credit sections", () => {
	expect(readSongCredits(documentWith({ data: [{ sections }] }))).toEqual([
		{ name: "Playboi Carti", role: "vocals" },
		{ name: "Jonah Abraham", role: "songwriting" },
		{ name: "Jordan Carter", role: "songwriting" },
		{ name: "Jonah Abraham", role: "producer" },
		{ name: "Marcus Fitz", role: "mixing engineer" },
		{ name: "Marcus Fitz", role: "engineer" },
		{ name: "Colin Leonard", role: "mastering engineer" },
	]);
});

test("loads the song page in English for stable role names", async () => {
	vi.mocked(fetch).mockResolvedValue(
		`<script>${JSON.stringify({ sections })}</script>`,
	);
	expect(
		await resolveSongCredits(
			"https://music.apple.com/pl/song/rockstar-made/1546163604",
		),
	).toContainEqual({ name: "Jonah Abraham", role: "producer" });
	expect(fetch).toHaveBeenLastCalledWith({
		url: "https://music.apple.com/pl/song/rockstar-made/1546163604?l=en-US",
		headers: { "Accept-Language": "en-US,en;q=0.9" },
	});
});

test("passes song credit URLs through album import without loading credits during the main import", async () => {
	vi.mocked(fetch).mockClear();
	vi.mocked(fetch).mockResolvedValue(
		`<script id="schema:music-album">${JSON.stringify({
			"@type": "MusicAlbum",
			name: "Whole Lotta Red",
			url: "https://music.apple.com/us/album/whole-lotta-red/1546163603",
			datePublished: "2020-12-25",
			byArtist: [{ name: "Playboi Carti" }],
			tracks: [
				{
					name: "Go2DaMoon (feat. Kanye West)",
					url: "https://music.apple.com/us/song/go2damoon/1546163605",
					duration: "PT2M",
				},
			],
		})}</script>`,
	);
	const result = await resolve(
		"https://music.apple.com/us/album/whole-lotta-red/1546163603",
	);
	expect(result.tracks?.[0]).toMatchObject({
		position: "1",
		title: "Go2DaMoon (feat. Kanye West)",
		creditsUrl: "https://music.apple.com/us/song/go2damoon/1546163605",
	});
	expect(fetch).toHaveBeenCalledOnce();
});

test("reports missing or malformed credit metadata instead of pretending there are none", () => {
	expect(() => readSongCredits(documentWith({ sections: [] }))).toThrow(
		"unavailable",
	);
	expect(() =>
		readSongCredits(
			documentWith({
				itemKind: "songDetailItemLockup",
				items: null,
			}),
		),
	).toThrow("Invalid");
});

test.each([
	"https://example.com/us/song/example/123",
	"http://music.apple.com/us/song/example/123",
	"https://music.apple.com/us/album/example/123",
])("rejects unexpected song credit URLs: %s", async (url) => {
	await expect(resolveSongCredits(url)).rejects.toThrow("Unsupported");
});
