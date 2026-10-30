import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetch } from "~/shared/utils/fetch";
import { requestToken } from "./auth";
import { Tidal } from "./index";
import { resolve } from "./resolve";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));
vi.mock("./auth", () => ({ requestToken: vi.fn() }));
vi.mock("~/shared/utils/cache", () => ({
	withCache: (_key: string, resolve: unknown) => resolve,
}));

const url = "https://tidal.com/browse/album/123";
const artist = {
	id: "artist",
	type: "artists",
	attributes: { name: "Main Artist" },
};
const album = {
	data: {
		id: "123",
		type: "albums",
		attributes: {
			title: "Example Album",
			albumType: "ALBUM",
			releaseDate: "2025-08-01",
			numberOfItems: 2,
			numberOfVolumes: 1,
			mediaTags: ["LOSSLESS"],
		},
		relationships: {
			artists: { data: [{ id: artist.id, type: artist.type }] },
			coverArt: { data: [{ id: "cover", type: "artworks" }] },
		},
	},
	included: [
		artist,
		{
			id: "cover",
			type: "artworks",
			attributes: {
				files: [
					{
						href: "https://resources.tidal.com/small.jpg",
						meta: { width: 80, height: 80 },
					},
					{
						href: "https://resources.tidal.com/large.jpg",
						meta: { width: 1280, height: 1280 },
					},
				],
			},
		},
	],
};
const trackPage = {
	data: [
		{ id: "101", type: "tracks", meta: { volumeNumber: 1, trackNumber: 1 } },
		{ id: "102", type: "tracks", meta: { volumeNumber: 1, trackNumber: 2 } },
	],
	included: [
		artist,
		{
			id: "102",
			type: "tracks",
			attributes: {
				title: "Second Track",
				version: "Club Mix",
				duration: "PT1H2M3S",
			},
			relationships: { artists: { data: [{ id: "guest", type: "artists" }] } },
		},
		{
			id: "101",
			type: "tracks",
			attributes: { title: "First Track", duration: "PT3M7S" },
			relationships: {
				artists: { data: [{ id: artist.id, type: artist.type }] },
			},
		},
		{ id: "guest", type: "artists", attributes: { name: "Guest Artist" } },
	],
	links: { self: "/albums/123/relationships/items" },
};

describe("Tidal imports", () => {
	beforeEach(() => {
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(JSON.stringify(album))
			.mockResolvedValueOnce(JSON.stringify(trackPage));
		vi.mocked(requestToken).mockReset().mockResolvedValue({
			access_token: "test-token",
			expires_in: 3600,
			token_type: "Bearer",
		});
	});

	test.each([
		url,
		"https://www.tidal.com/album/123",
		"https://listen.tidal.com/album/123/",
		"https://tidal.com/album/123?u",
		"https://tidal.com/browse/album/123?utm_source=test",
		"https://tidal.com/browse/us/album/123",
		"https://tidal.com/album/123/credits",
		"https://tidal.com/album/123/credits/?test=1",
	])("recognizes album URL %s", (url) => {
		expect(Tidal.regex.test(url)).toBe(true);
	});

	test.each([
		"https://tidal.com/track/123",
		"https://tidal.com/browse/artist/123",
		"https://tidal.com/browse/album/123abc",
		"https://tidal.com.evil.example/album/123",
		"https://tidal.com/album/123/credits/other",
	])("rejects non-album URL %s", async (url) => {
		expect(Tidal.regex.test(url)).toBe(false);
		await expect(resolve(url)).rejects.toThrow("Unsupported Tidal album URL");
		expect(requestToken).not.toHaveBeenCalled();
	});

	test("imports API metadata and resolves tracks in album order, not included order", async () => {
		expect(await resolve(url)).toEqual({
			url,
			title: "Example Album",
			artists: ["Main Artist"],
			date: { year: 2025, month: 8, day: 1 },
			type: "album",
			format: "lossless digital",
			attributes: ["streaming"],
			coverArt: ["https://resources.tidal.com/large.jpg"],
			tracks: [
				{
					position: "1",
					title: "First Track",
					duration: "3:07",
					artists: ["Main Artist"],
					creditsUrl: "https://tidal.com/album/123/track/101",
				},
				{
					position: "2",
					title: "Second Track (Club Mix)",
					duration: "62:03",
					artists: ["Guest Artist"],
					creditsUrl: "https://tidal.com/album/123/track/102",
				},
			],
		});
		expect(fetch).toHaveBeenNthCalledWith(1, {
			url: "https://openapi.tidal.com/v2/albums/123",
			headers: {
				Authorization: "Bearer test-token",
				Accept: "application/vnd.api+json",
			},
			urlParameters: { countryCode: "US", include: "artists,coverArt" },
		});
	});

	test("accepts a pasted credits-page link while keeping the canonical album URL", async () => {
		await expect(
			resolve("https://tidal.com/album/123/credits"),
		).resolves.toMatchObject({
			url,
			tracks: [
				{ creditsUrl: "https://tidal.com/album/123/track/101" },
				{ creditsUrl: "https://tidal.com/album/123/track/102" },
			],
		});
	});

	test("collects paginated tracks and preserves disc positions", async () => {
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(
				JSON.stringify({
					...album,
					data: {
						...album.data,
						attributes: { ...album.data.attributes, numberOfVolumes: 2 },
					},
				}),
			)
			.mockResolvedValueOnce(
				JSON.stringify({
					...trackPage,
					data: [trackPage.data[0]],
					links: {
						next: "/albums/123/relationships/items?page[cursor]=second",
					},
				}),
			)
			.mockResolvedValueOnce(
				JSON.stringify({
					...trackPage,
					data: [
						{ ...trackPage.data[1], meta: { volumeNumber: 2, trackNumber: 1 } },
					],
				}),
			);
		const data = await resolve(url);
		expect(data.tracks?.map((track) => track.position)).toEqual(["1.1", "2.1"]);
		expect(fetch).toHaveBeenLastCalledWith(
			expect.objectContaining({
				url: "https://openapi.tidal.com/v2/albums/123/relationships/items?page[cursor]=second",
			}),
		);
	});

	test("collects all 201 tracks and preserves raw feature titles and track artists", async () => {
		const items = Array.from({ length: 201 }, (_, index) => ({
			id: String(1000 + index),
			type: "tracks",
			meta: { volumeNumber: 1, trackNumber: index + 1 },
		}));
		const resources = items.map((item) => ({
			...item,
			attributes: { title: "Song (feat. Guest Artist)", duration: "PT1M" },
			relationships: {
				artists: {
					data: [
						{ id: artist.id, type: artist.type },
						{ id: "guest", type: "artists" },
					],
				},
			},
		}));
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(
				JSON.stringify({
					...album,
					data: {
						...album.data,
						attributes: { ...album.data.attributes, numberOfItems: 201 },
					},
				}),
			);
		for (let offset = 0; offset < items.length; offset += 100) {
			vi.mocked(fetch).mockResolvedValueOnce(
				JSON.stringify({
					data: items.slice(offset, offset + 100),
					included: [
						artist,
						{
							id: "guest",
							type: "artists",
							attributes: { name: "Guest Artist" },
						},
						...resources.slice(offset, offset + 100),
					],
					links:
						offset + 100 < items.length
							? {
									next: `/albums/123/relationships/items?page[cursor]=${offset + 100}`,
								}
							: {},
				}),
			);
		}
		const result = await resolve(url);
		expect(result.tracks).toHaveLength(201);
		expect(result.tracks?.map((track) => track.position)).toEqual(
			items.map((item) => String(item.meta.trackNumber)),
		);
		expect(result.tracks?.at(-1)).toMatchObject({
			title: "Song (feat. Guest Artist)",
			artists: ["Main Artist", "Guest Artist"],
			creditsUrl: "https://tidal.com/album/123/track/1200",
		});
		expect(fetch).toHaveBeenCalledTimes(4);
	});

	test("does not send credentials to an unexpected pagination host", async () => {
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(JSON.stringify(album))
			.mockResolvedValueOnce(
				JSON.stringify({
					...trackPage,
					links: { next: "https://example.com/albums/123/relationships/items" },
				}),
			);
		await expect(resolve(url)).rejects.toThrow(
			"Invalid Tidal track pagination",
		);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test("rejects incomplete tracklists", async () => {
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(JSON.stringify(album))
			.mockResolvedValueOnce(
				JSON.stringify({ ...trackPage, data: [trackPage.data[0]] }),
			);
		await expect(resolve(url)).rejects.toThrow("incomplete tracklist");
	});

	test("detects repeated pagination links instead of looping", async () => {
		const page = {
			...trackPage,
			links: { next: "/albums/123/relationships/items?page[cursor]=repeat" },
		};
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(JSON.stringify(album))
			.mockResolvedValue(JSON.stringify(page));
		await expect(resolve(url)).rejects.toThrow(
			"Invalid Tidal track pagination",
		);
		expect(fetch).toHaveBeenCalledTimes(3);
	});

	test("reports invalid track duration", async () => {
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(JSON.stringify(album))
			.mockResolvedValueOnce(
				JSON.stringify({
					...trackPage,
					included: trackPage.included.map((resource) =>
						resource.type === "tracks"
							? {
									...resource,
									attributes: { ...resource.attributes, duration: "PT" },
								}
							: resource,
					),
				}),
			);
		await expect(resolve(url)).rejects.toThrow(
			"Could not parse Tidal track duration",
		);
	});

	test("uses album type metadata and does not claim downloads for streams", async () => {
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(
				JSON.stringify({
					...album,
					data: {
						...album.data,
						attributes: {
							...album.data.attributes,
							albumType: "EP",
							mediaTags: [],
						},
					},
				}),
			)
			.mockResolvedValueOnce(JSON.stringify(trackPage));
		expect(await resolve(url)).toMatchObject({
			type: "ep",
			format: "digital file",
			attributes: ["streaming"],
		});
	});

	test("rejects missing included tracks rather than silently dropping them", async () => {
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(JSON.stringify(album))
			.mockResolvedValueOnce(JSON.stringify({ ...trackPage, included: [] }));
		await expect(resolve(url)).rejects.toThrow("Missing Tidal tracks");
	});

	test("reports API errors", async () => {
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(
				JSON.stringify({
					errors: [{ detail: "Not available in this country" }],
				}),
			);
		await expect(resolve(url)).rejects.toThrow(
			"Tidal import failed: Not available in this country",
		);
	});

	test("propagates authentication failures", async () => {
		vi.mocked(requestToken).mockRejectedValue(
			new Error("Failed to get access token"),
		);
		await expect(resolve(url)).rejects.toThrow("Failed to get access token");
		expect(fetch).not.toHaveBeenCalled();
	});
});
