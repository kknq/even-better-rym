import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetch } from "~/shared/utils/fetch";
import { Deezer } from "./index";
import { resolve } from "./resolve";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));
vi.mock("~/shared/utils/cache", () => ({
	withCache: (_key: string, resolve: unknown) => resolve,
}));

const url = "https://www.deezer.com/album/302127";
const album = {
	title: "Discovery",
	artist: { name: "Daft Punk" },
	contributors: [
		{ name: "Daft Punk", role: "Main" },
		{ name: "Guest", role: "Featured" },
	],
	release_date: "2001-03-07",
	record_type: "album",
	label: "Daft Life",
	cover_xl: "https://cdn-images.dzcdn.net/images/cover/example/1000x1000.jpg",
	nb_tracks: 2,
	tracks: {
		data: [
			{ title: "One More Time", duration: 320, artist: { name: "Daft Punk" } },
			{ title: "Aerodynamic", duration: 212, artist: { name: "Daft Punk" } },
		],
	},
};

describe("Deezer imports", () => {
	beforeEach(() => {
		vi.mocked(fetch).mockReset().mockResolvedValue(JSON.stringify(album));
	});

	test.each([
		url,
		"https://deezer.com/en/album/302127/",
		"https://www.deezer.com/pl/album/302127?utm_source=test",
		"https://www.deezer.com/en-us/album/302127#tracks",
	])("recognizes album URL %s", (url) => {
		expect(Deezer.regex.test(url)).toBe(true);
	});

	test.each([
		"https://www.deezer.com/track/302127",
		"https://www.deezer.com/artist/27",
		"https://www.deezer.com/album/302127abc",
		"https://www.deezer.com.evil.example/album/302127",
	])("rejects non-album URL %s", async (url) => {
		expect(Deezer.regex.test(url)).toBe(false);
		await expect(resolve(url)).rejects.toThrow("Unsupported Deezer album URL");
		expect(fetch).not.toHaveBeenCalled();
	});

	test("imports album metadata, full track lengths, label and cover", async () => {
		expect(await resolve(url)).toEqual({
			url,
			title: "Discovery",
			artists: ["Daft Punk"],
			date: { year: 2001, month: 3, day: 7 },
			type: "album",
			format: "lossless digital",
			attributes: ["streaming"],
			label: { name: "Daft Life" },
			coverArt: [album.cover_xl],
			tracks: [
				{ position: "1", title: "One More Time", duration: "5:20" },
				{ position: "2", title: "Aerodynamic", duration: "3:32" },
			],
		});
		expect(fetch).toHaveBeenCalledWith({
			url: "https://api.deezer.com/album/302127",
		});
	});

	test("collects every page in order and includes compilation track artists", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce(
				JSON.stringify({
					...album,
					artist: { name: "Various Artists" },
					record_type: "compile",
					contributors: [],
					tracks: {
						data: [album.tracks.data[0]],
						next: "https://api.deezer.com/album/302127/tracks?index=1",
					},
				}),
			)
			.mockResolvedValueOnce(JSON.stringify({ data: [album.tracks.data[1]] }));
		const result = await resolve(url);
		expect(result.type).toBe("compilation");
		expect(result.tracks?.map((track) => track.title)).toEqual([
			"Daft Punk - One More Time",
			"Daft Punk - Aerodynamic",
		]);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test("retains all main album artists but excludes featured contributors", async () => {
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({
				...album,
				contributors: [
					...album.contributors,
					{ name: "Second Artist", role: "Main" },
				],
			}),
		);
		expect((await resolve(url)).artists).toEqual([
			"Daft Punk",
			"Second Artist",
		]);
	});

	test.each(["ep", "single"])("honors record type %s", async (record_type) => {
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({ ...album, record_type }),
		);
		expect((await resolve(url)).type).toBe(record_type);
	});

	test.each([
		"https://example.com/album/302127/tracks",
		"https://api.deezer.com/album/999/tracks",
	])("rejects unexpected pagination target %s", async (next) => {
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({ ...album, tracks: { ...album.tracks, next } }),
		);
		await expect(resolve(url)).rejects.toThrow(
			"Invalid Deezer track pagination",
		);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	test("rejects incomplete tracklists", async () => {
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({ ...album, nb_tracks: 3 }),
		);
		await expect(resolve(url)).rejects.toThrow("incomplete tracklist");
	});

	test("detects repeated pagination links instead of looping", async () => {
		const next = "https://api.deezer.com/album/302127/tracks?index=1";
		vi.mocked(fetch)
			.mockResolvedValueOnce(
				JSON.stringify({ ...album, tracks: { ...album.tracks, next } }),
			)
			.mockResolvedValue(JSON.stringify({ data: [], next }));
		await expect(resolve(url)).rejects.toThrow(
			"Invalid Deezer track pagination",
		);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test("reports API errors", async () => {
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({ error: { code: 800, message: "no data" } }),
		);
		await expect(resolve(url)).rejects.toThrow(
			"Deezer import failed (800): no data",
		);
	});

	test("propagates fetch failures", async () => {
		vi.mocked(fetch).mockRejectedValue(new Error("HTTP 403"));
		await expect(resolve(url)).rejects.toThrow("HTTP 403");
	});
});
