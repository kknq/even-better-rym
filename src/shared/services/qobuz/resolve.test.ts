// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { getGuestArtists } from "~/modules/release-submission/utils/guest-credits";
import {
	getNonFeaturedTrackArtists,
	getSuggestedCredits,
} from "~/modules/release-submission/utils/suggested-credits";
import { fetch } from "~/shared/utils/fetch";
import { Qobuz } from "./index";
import { resolve } from "./resolve";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));
vi.mock("~/shared/utils/cache", () => ({
	withCache: (_key: string, resolve: unknown) => resolve,
}));

const id = "0724384960650";
const url = `https://www.qobuz.com/us-en/album/discovery-daft-punk/${id}`;
const scriptUrl = "https://open.qobuz.com/resources/2.2.3/js/main.js";
const apiUrl = "https://www.qobuz.com/api.json/0.2/album/get";
const track = {
	id: 1068442,
	title: "One More Time",
	version: null,
	duration: 320,
	track_number: 1,
	media_number: 1,
	performer: { name: "Daft Punk" },
	performers:
		"Daft Punk, MainArtist - Romanthony, Vocals - Anthony Moore, Writer",
};
const album = {
	id,
	title: "Discovery",
	version: null,
	artist: { name: "Daft Punk" },
	artists: [{ name: "Daft Punk", roles: ["main-artist"] }],
	release_date_original: "2001-03-07",
	image: {
		large: "https://static.qobuz.com/images/covers/50/06/0724384960650_600.jpg",
	},
	label: { name: "Daft Life" },
	tracks_count: 2,
	media_count: 1,
	tracks: {
		offset: 0,
		limit: 100,
		total: 2,
		items: [
			track,
			{
				...track,
				id: 1068443,
				title: "Aerodynamic",
				duration: 212,
				track_number: 2,
			},
		],
	},
};
let metadata: unknown;
let playerHtml: string;
let playerScript: string;

describe("Qobuz imports", () => {
	beforeEach(() => {
		metadata = structuredClone(album);
		playerHtml = `<script src="/resources/2.2.3/js/main.js"></script>`;
		playerScript = `config.qobuzapi={app_id:"123456789"}`;
		vi.mocked(fetch)
			.mockReset()
			.mockImplementation(({ url: requestUrl }) => {
				if (requestUrl === `https://open.qobuz.com/album/${id}`)
					return Promise.resolve(playerHtml);
				if (
					/^https:\/\/open\.qobuz\.com\/resources\/[^/]+\/js\/main\.js$/.test(
						requestUrl,
					)
				)
					return Promise.resolve(playerScript);
				if (requestUrl === apiUrl)
					return Promise.resolve(JSON.stringify(metadata));
				throw new Error("Unexpected Qobuz test request");
			});
	});

	test.each([
		url,
		url.replace("us-en", "gb-en"),
		`${url}?utm_source=test`,
		`https://open.qobuz.com/album/${id}`,
		"https://open.qobuz.com/album/abcdef1234/",
	])("recognizes album URL %s", (url) => {
		expect(Qobuz.regex.test(url)).toBe(true);
	});

	test.each([
		"https://open.qobuz.com/artist/123",
		"https://www.qobuz.com/us-en/search/albums/Discovery",
		"https://open.qobuz.com.evil.example/album/123",
		"https://www.qobuz.com/us-en/album/example/123/unrelated",
		"https://user@open.qobuz.com/album/123",
	])("rejects non-album URL %s", async (url) => {
		expect(Qobuz.regex.test(url)).toBe(false);
		await expect(resolve(url)).rejects.toThrow("Unsupported Qobuz album URL");
		expect(fetch).not.toHaveBeenCalled();
	});

	test("imports public metadata, raw titles, track artists and role credits without a storefront fetch", async () => {
		expect(await resolve(url)).toEqual({
			url,
			title: "Discovery",
			artists: ["Daft Punk"],
			date: { year: 2001, month: 3, day: 7 },
			type: "single",
			format: "lossless digital",
			attributes: ["downloadable", "streaming"],
			coverArt: [
				"https://static.qobuz.com/images/covers/50/06/0724384960650_max.jpg",
			],
			label: { name: "Daft Life" },
			tracks: [
				{
					position: "1",
					title: "One More Time",
					duration: "5:20",
					artists: ["Daft Punk"],
					credits: [
						{ name: "Romanthony", role: "vocals" },
						{ name: "Anthony Moore", role: "writer" },
					],
				},
				{
					position: "2",
					title: "Aerodynamic",
					duration: "3:32",
					artists: ["Daft Punk"],
					credits: [
						{ name: "Romanthony", role: "vocals" },
						{ name: "Anthony Moore", role: "writer" },
					],
				},
			],
		});
		expect(fetch).toHaveBeenCalledTimes(3);
		expect(fetch).toHaveBeenLastCalledWith({
			url: apiUrl,
			urlParameters: {
				album_id: id,
				app_id: "123456789",
				limit: "100",
				offset: "0",
			},
			credentials: "omit",
		});
	});

	test.each([
		url.replace("us-en", "fr-fr"),
		`https://open.qobuz.com/album/${id}`,
	])("normalizes imported source links without relying on localized storefront text: %s", async (input) => {
		const result = await resolve(input);
		expect(result.url).toBe(
			input.includes("open.qobuz.com")
				? `https://www.qobuz.com/us-en/album/-/${id}`
				: url,
		);
		expect(fetch).toHaveBeenCalledWith({
			url: `https://open.qobuz.com/album/${id}`,
			credentials: "omit",
		});
	});

	test("discovers the current public client version and identifier instead of hard-coding either", async () => {
		playerHtml = '<script src="/resources/9.8.7/js/main.js"></script>';
		playerScript = `config.qobuzapi={"app_id": "987654321"}`;
		await resolve(url);
		expect(fetch).toHaveBeenCalledWith({
			url: "https://open.qobuz.com/resources/9.8.7/js/main.js",
			credentials: "omit",
		});
		expect(vi.mocked(fetch).mock.calls.at(-1)?.[0].urlParameters?.app_id).toBe(
			"987654321",
		);
	});

	test.each([
		"<title>Access denied</title>",
		'<script src="https://evil.example/resources/2.2.3/js/main.js"></script>',
		'<script src="https://user@open.qobuz.com/resources/2.2.3/js/main.js"></script>',
	])("rejects unavailable or untrusted player initialization: %s", async (html) => {
		playerHtml = html;
		await expect(resolve(url)).rejects.toThrow(
			"Could not find Qobuz public metadata client",
		);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	test("reports changed client bundles instead of inventing an API identifier", async () => {
		playerScript = "changed player bundle";
		await expect(resolve(url)).rejects.toThrow(
			"Could not initialize Qobuz public metadata client",
		);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test("reports API errors", async () => {
		metadata = { status: "error", message: "Album not found" };
		await expect(resolve(url)).rejects.toThrow(
			"Qobuz import failed: Album not found",
		);
	});

	test.each([
		null,
		{ ...album, id: "another-album" },
		{ ...album, title: "" },
		{ ...album, tracks_count: 0 },
		{ ...album, artists: {} },
		{ ...album, artist: null, artists: [] },
		{ ...album, release_date_original: "invalid date" },
		{ ...album, image: "invalid cover" },
		{ ...album, label: { name: "" } },
		{ ...album, artists: [{ name: "", roles: ["main-artist"] }] },
		{ ...album, tracks: { ...album.tracks, offset: 1 } },
		{ ...album, tracks: { ...album.tracks, total: 3 } },
		{ ...album, tracks: { ...album.tracks, items: null } },
		{ ...album, tracks: { ...album.tracks, items: [] } },
		{ ...album, tracks: { ...album.tracks, items: [track, track] } },
		{
			...album,
			tracks: { ...album.tracks, items: [{ ...track, media_number: 2 }] },
		},
		{
			...album,
			tracks: { ...album.tracks, items: [{ ...track, duration: -1 }] },
		},
		{
			...album,
			tracks: { ...album.tracks, items: [{ ...track, track_number: 0 }] },
		},
		{
			...album,
			tracks: {
				...album.tracks,
				items: [{ ...track, performer: { name: "" } }],
			},
		},
	])("rejects malformed or mismatched metadata: %#", async (value) => {
		metadata = value;
		await expect(resolve(url)).rejects.toThrow(/Qobuz/);
	});

	test("does not label an incomplete or repeated page as a successful import", async () => {
		metadata = {
			...album,
			tracks_count: 3,
			tracks: { ...album.tracks, total: 3 },
		};
		await expect(resolve(url)).rejects.toThrow(/pagination|incomplete/);
	});

	test("imports 201 tracks across all three pages with one client initialization", async () => {
		const items = Array.from({ length: 201 }, (_, index) => ({
			...track,
			id: index + 1,
			title: `Track ${index + 1}`,
			track_number: index + 1,
		}));
		vi.mocked(fetch).mockImplementation(
			({ url: requestUrl, urlParameters }) => {
				if (requestUrl === apiUrl) {
					const offset = Number(urlParameters?.offset);
					return Promise.resolve(
						JSON.stringify({
							...album,
							tracks_count: items.length,
							tracks: {
								offset,
								total: items.length,
								limit: 100,
								items: items.slice(offset, offset + 100),
							},
						}),
					);
				}
				return Promise.resolve(
					requestUrl === scriptUrl ? playerScript : playerHtml,
				);
			},
		);
		const result = await resolve(url);
		expect(
			result.tracks?.map(({ position, title }) => [position, title]),
		).toEqual(items.map((item) => [String(item.track_number), item.title]));
		expect(fetch).toHaveBeenCalledTimes(5);
		expect(
			vi
				.mocked(fetch)
				.mock.calls.filter(([data]) => data.url === apiUrl)
				.map(([data]) => data.urlParameters?.offset),
		).toEqual(["0", "100", "200"]);
	});

	test("keeps disc positions and source title versions without embedding artist prefixes", async () => {
		metadata = {
			...album,
			title: "Album",
			version: "Deluxe",
			media_count: 2,
			tracks: {
				...album.tracks,
				items: [
					{ ...track, title: "Song [feat. Guest]", version: "Live" },
					{
						...track,
						id: 1068443,
						title: "Other (Live)",
						version: "Live",
						media_number: 2,
					},
				],
			},
		};
		const result = await resolve(url);
		expect(result.title).toBe("Album (Deluxe)");
		expect(
			result.tracks?.map(({ position, title }) => [position, title]),
		).toEqual([
			["1.1", "Song [feat. Guest] (Live)"],
			["2.1", "Other (Live)"],
		]);
	});

	test("uses source main-artist roles for split releases and keeps composer coverage separate", async () => {
		metadata = {
			...album,
			artist: { name: "Barbelith" },
			artists: [
				{ name: "Barbelith", roles: ["main-artist"] },
				{ name: "Trhä", roles: ["main-artist"] },
				{ name: "Composer", roles: ["composer"] },
			],
			tracks: {
				...album.tracks,
				items: [
					{
						...track,
						performer: { name: "Barbelith" },
						performers: "Barbelith, MainArtist - Writer, Composer, Lyricist",
					},
					{
						...track,
						id: 1068443,
						track_number: 2,
						performer: { name: "Trhä" },
						performers: "Trhä, MainArtist - Writer, Composer",
					},
				],
			},
		};
		const result = await resolve(url);
		expect(result.artists).toEqual(["Barbelith", "Trhä"]);
		expect(result.tracks?.map((track) => track.artists)).toEqual([
			["Barbelith"],
			["Trhä"],
		]);
		expect(getGuestArtists(result.tracks ?? [], result.artists ?? [])).toEqual(
			[],
		);
		expect(getSuggestedCredits(result.tracks ?? [])).toMatchObject([
			{ name: "Writer", role: "composer", positions: [] },
			{ name: "Writer", role: "lyrics", positions: ["1"] },
		]);
	});

	test("shares featured credits with title and guest exclusion while retaining other roles", async () => {
		metadata = {
			...album,
			artist: { name: "Playboi Carti" },
			artists: [],
			tracks: {
				...album.tracks,
				items: [
					{
						...track,
						performer: { name: "Playboi Carti" },
						performers:
							"Playboi Carti, MainArtist - Kanye West, FeaturedArtist, ComposerLyricist",
					},
					{
						...track,
						id: 1068443,
						track_number: 2,
						performer: { name: "Playboi Carti" },
						performers: "Playboi Carti, MainArtist - Other, Producer",
					},
				],
			},
		};
		const result = await resolve(url);
		expect(result.tracks?.[0]?.artists).toEqual([
			"Playboi Carti",
			"Kanye West",
		]);
		expect(getNonFeaturedTrackArtists(result.tracks?.[0] ?? {})).toEqual([
			"Playboi Carti",
		]);
		expect(getGuestArtists(result.tracks ?? [], result.artists ?? [])).toEqual(
			[],
		);
		expect(getSuggestedCredits(result.tracks ?? [])).toMatchObject([
			{ name: "Kanye West", role: "featured", positions: ["1"] },
			{ name: "Kanye West", role: "songwriting", positions: ["1"] },
			{ name: "Other", role: "producer", positions: ["2"] },
		]);
	});
});
