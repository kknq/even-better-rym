import { beforeEach, describe, expect, test, vi } from "vitest";
import { fetch } from "~/shared/utils/fetch";
import * as storage from "~/shared/utils/storage";
import { Mixcloud } from "./index";
import { resolve } from "./resolve";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));
vi.mock("~/shared/utils/storage", () => ({
	get: vi.fn(),
	set: vi.fn(),
	remove: vi.fn(),
	getAll: vi.fn().mockResolvedValue({}),
}));

const url = "https://www.mixcloud.com/huerco_s/eargasmlodgemix/";
const imagePath = "extaudio/9/e/9/b/caa1-7d77-4b04-9250-1b34e8d88d66.jpg";
const show = {
	key: "/huerco_s/eargasmlodgemix/",
	name: "\u25efEARGASM\u25efLODGE\u25efMIX\u25ef",
	created_time: "2011-10-28T00:44:15Z",
	updated_time: "2026-10-28T13:44:48Z",
	user: { name: "HUERCO S.", username: "huerco_s" },
	audio_length: 2766,
	pictures: {
		large: `https://thumbnailer.mixcloud.com/unsafe/300x300/${imagePath}`,
		extra_large: `https://thumbnailer.mixcloud.com/unsafe/600x600/${imagePath}`,
	},
	sections: [],
};

describe("Mixcloud", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(fetch).mockResolvedValue(JSON.stringify(show));
		vi.mocked(storage.get).mockResolvedValue(undefined);
	});

	test.each([
		url,
		url.slice(0, -1),
		url.replace("www.", ""),
		url.replace("https:", "http:"),
		`${url}?utm_source=test#player`,
	])("recognizes show URL %s", (url) => {
		expect(Mixcloud.regex.test(url)).toBe(true);
	});

	test.each([
		"https://www.mixcloud.com/huerco_s/",
		"https://www.mixcloud.com/huerco_s/playlists/example/",
		"https://www.mixcloud.com/discover/techno/",
		"https://www.mixcloud.com/genres/techno/",
		"https://www.mixcloud.com/live/huerco_s/",
		"https://www.mixcloud.com/search/?q=example",
		"https://api.mixcloud.com/huerco_s/eargasmlodgemix/",
		"https://www.mixcloud.com.evil.example/huerco_s/eargasmlodgemix/",
		`https://example.com/${url}`,
	])("rejects non-show URL %s", async (url) => {
		expect(Mixcloud.regex.test(url)).toBe(false);
		await expect(resolve(url)).rejects.toThrow("Unsupported Mixcloud show URL");
		expect(fetch).not.toHaveBeenCalled();
	});

	test("imports the reference show with its original cover and publication date", async () => {
		expect(await resolve(url)).toEqual({
			url,
			title: show.name,
			artists: ["HUERCO S."],
			artistMode: "text",
			date: { year: 2011, month: 10, day: 28 },
			type: "dj mix",
			format: "digital file",
			attributes: ["streaming"],
			label: { id: 897, name: "(No Label)", catno: "n/a" },
			filedUnderCreditRole: "DJ mixing",
			tracks: [{ position: "1", title: show.name, duration: "46:06" }],
			coverArt: [`https://thumbnailer.mixcloud.com/unsafe/${imagePath}`],
		});
		expect(fetch).toHaveBeenCalledWith({
			url: "https://api.mixcloud.com/huerco_s/eargasmlodgemix/",
		});
	});

	test("canonicalizes the source URL and keeps tracking parameters out of API requests", async () => {
		expect((await resolve(`${url}?utm_source=test#player`)).url).toBe(url);
		expect(fetch).toHaveBeenCalledWith({
			url: "https://api.mixcloud.com/huerco_s/eargasmlodgemix/",
		});
	});

	test("imports one full-length mix even when individual tracks are published", async () => {
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({
				...show,
				sections: [
					{ section_type: "chapter", chapter: "Opening", start_time: 0 },
					{
						section_type: "track",
						start_time: 22,
						duration: 85,
						track: { artist: "First Artist", name: "First Track" },
					},
					{
						section_type: "track",
						start_time: 110,
						track: { artist: "Second Artist", name: "Second Track" },
					},
				],
			}),
		);
		expect((await resolve(url)).tracks).toEqual([
			{ position: "1", title: show.name, duration: "46:06" },
		]);
	});

	test("imports the full mix when no tracklist is published", async () => {
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({ ...show, sections: undefined }),
		);
		expect((await resolve(url)).tracks).toEqual([
			{ position: "1", title: show.name, duration: "46:06" },
		]);
	});

	test("formats the entire length of mixes longer than an hour", async () => {
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({ ...show, audio_length: 7323 }),
		);
		expect((await resolve(url)).tracks).toEqual([
			{ position: "1", title: show.name, duration: "122:03" },
		]);
	});

	test.each([
		undefined,
		null,
		"2766",
		0,
		-1,
	])("reports invalid mix duration %s", async (audio_length) => {
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({ ...show, audio_length }),
		);
		await expect(resolve(url)).rejects.toThrow(
			"Could not parse Mixcloud mix duration",
		);
	});

	test("handles missing optional images and date without inventing metadata", async () => {
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({ ...show, pictures: undefined, created_time: undefined }),
		);
		const result = await resolve(url);
		expect(result.coverArt).toBeUndefined();
		expect(result.date).toBeUndefined();
		expect(result).not.toHaveProperty("classifiers");
	});

	test("removes image resizing and watermark filters", async () => {
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({
				...show,
				pictures: {
					large: `https://thumbnailer.mixcloud.com/unsafe/1200x630/filters:watermark(graphics/play-button-scaled.png,300,15,0)/${imagePath}`,
				},
			}),
		);
		expect((await resolve(url)).coverArt).toEqual([
			`https://thumbnailer.mixcloud.com/unsafe/${imagePath}`,
		]);
	});

	test("does not rewrite unrelated image hosts", async () => {
		const image = "https://example.com/unsafe/300x300/image.jpg";
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({ ...show, pictures: { large: image } }),
		);
		expect((await resolve(url)).coverArt).toEqual([image]);
	});

	test.each([
		{ error: { type: "CloudcastNotFound" } },
		{ ...show, name: "" },
		{ ...show, user: null },
		{ ...show, created_time: "invalid date" },
	])("reports invalid or unavailable show data %#", async (data) => {
		vi.mocked(fetch).mockResolvedValue(JSON.stringify(data));
		await expect(resolve(url)).rejects.toThrow(/Mixcloud/);
	});

	test("propagates fetch failures", async () => {
		vi.mocked(fetch).mockRejectedValue(new Error("HTTP 403"));
		await expect(resolve(url)).rejects.toThrow("HTTP 403");
	});

	test("reads cached metadata and applies static defaults without refetching", async () => {
		vi.mocked(storage.get).mockResolvedValue({
			expire: Date.now() + 60_000,
			data: {
				title: show.name,
				artists: ["HUERCO S."],
				tracks: [{ position: "1", title: show.name, duration: "46:06" }],
			},
		});
		expect(await Mixcloud.resolve(url)).toMatchObject({
			title: show.name,
			label: { id: 897, name: "(No Label)", catno: "n/a" },
			filedUnderCreditRole: "DJ mixing",
			tracks: [{ position: "1", title: show.name, duration: "46:06" }],
		});
		expect(fetch).not.toHaveBeenCalled();
		expect(storage.get).toHaveBeenCalledWith(
			JSON.stringify(["mixcloud-resolve-v2", [url]]),
		);
	});

	test("caches fresh imports", async () => {
		const data = await Mixcloud.resolve(url);
		expect(storage.set).toHaveBeenCalledWith(
			JSON.stringify(["mixcloud-resolve-v2", [url]]),
			expect.objectContaining({
				data,
			}),
		);
	});
});
