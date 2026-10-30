import { beforeEach, describe, expect, test, vi } from "vitest";
import { getGuestArtists } from "~/modules/release-submission/utils/guest-credits";
import { getSuggestedCredits } from "~/modules/release-submission/utils/suggested-credits";
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
			{
				id: 1,
				title: "One More Time",
				duration: 320,
				artist: { name: "Daft Punk" },
				track_position: 1,
				disk_number: 1,
			},
			{
				id: 2,
				title: "Aerodynamic",
				duration: 212,
				artist: { name: "Daft Punk" },
				track_position: 2,
				disk_number: 1,
			},
		],
	},
};

describe("Deezer imports", () => {
	beforeEach(() => {
		vi.mocked(fetch)
			.mockReset()
			.mockImplementation(({ url }) =>
				Promise.resolve(
					JSON.stringify(url.includes("/tracks") ? album.tracks : album),
				),
			);
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
				{
					position: "1",
					title: "One More Time",
					duration: "5:20",
					artists: ["Daft Punk"],
					creditsUrl: "https://www.deezer.com/track/1",
				},
				{
					position: "2",
					title: "Aerodynamic",
					duration: "3:32",
					artists: ["Daft Punk"],
					creditsUrl: "https://www.deezer.com/track/2",
				},
			],
		});
		expect(fetch).toHaveBeenCalledWith({
			url: "https://api.deezer.com/album/302127",
		});
		expect(fetch).toHaveBeenCalledWith({
			url: "https://api.deezer.com/album/302127/tracks?limit=100",
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
				}),
			)
			.mockResolvedValueOnce(
				JSON.stringify({
					data: [album.tracks.data[0]],
					next: "https://api.deezer.com/album/302127/tracks?index=1",
				}),
			)
			.mockResolvedValueOnce(JSON.stringify({ data: [album.tracks.data[1]] }));
		const result = await resolve(url);
		expect(result.type).toBe("compilation");
		expect(result.tracks?.map((track) => track.title)).toEqual([
			"One More Time",
			"Aerodynamic",
		]);
		expect(result.tracks?.map((track) => track.artists)).toEqual([
			["Daft Punk"],
			["Daft Punk"],
		]);
		expect(fetch).toHaveBeenCalledTimes(3);
	});

	test("retains all main album artists but excludes featured contributors", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
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
		vi.mocked(fetch).mockResolvedValueOnce(
			JSON.stringify({ ...album, record_type }),
		);
		expect((await resolve(url)).type).toBe(record_type);
	});

	test.each([
		"https://example.com/album/302127/tracks",
		"https://api.deezer.com/album/999/tracks",
	])("rejects unexpected pagination target %s", async (next) => {
		vi.mocked(fetch)
			.mockResolvedValueOnce(JSON.stringify(album))
			.mockResolvedValueOnce(JSON.stringify({ ...album.tracks, next }));
		await expect(resolve(url)).rejects.toThrow(
			"Invalid Deezer track pagination",
		);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test("rejects incomplete tracklists", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			JSON.stringify({ ...album, nb_tracks: 3 }),
		);
		await expect(resolve(url)).rejects.toThrow("incomplete tracklist");
	});

	test("detects repeated pagination links instead of looping", async () => {
		const next = "https://api.deezer.com/album/302127/tracks?index=1";
		vi.mocked(fetch)
			.mockResolvedValueOnce(JSON.stringify(album))
			.mockResolvedValueOnce(JSON.stringify({ ...album.tracks, next }))
			.mockResolvedValue(JSON.stringify({ data: [], next }));
		await expect(resolve(url)).rejects.toThrow(
			"Invalid Deezer track pagination",
		);
		expect(fetch).toHaveBeenCalledTimes(3);
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

	test("imports more than 100 tracks across every page without truncating or reordering them", async () => {
		const tracks = Array.from({ length: 201 }, (_, index) => ({
			...album.tracks.data[0],
			id: index + 1,
			title: `Song ${index + 1}`,
			track_position: index + 1,
		}));
		const secondPage =
			"https://api.deezer.com/album/302127/tracks?limit=100&index=100";
		const thirdPage =
			"https://api.deezer.com/album/302127/tracks?limit=100&index=200";
		vi.mocked(fetch)
			.mockResolvedValueOnce(JSON.stringify({ ...album, nb_tracks: 201 }))
			.mockResolvedValueOnce(
				JSON.stringify({ data: tracks.slice(0, 100), next: secondPage }),
			)
			.mockResolvedValueOnce(
				JSON.stringify({ data: tracks.slice(100, 200), next: thirdPage }),
			)
			.mockResolvedValueOnce(JSON.stringify({ data: tracks.slice(200) }));
		const result = await resolve(url);
		expect(result.tracks).toHaveLength(201);
		expect(result.tracks?.map((track) => track.title)).toEqual(
			tracks.map((track) => track.title),
		);
		expect(result.tracks?.map((track) => track.position)).toEqual(
			tracks.map((track) => String(track.track_position)),
		);
		expect(vi.mocked(fetch).mock.calls.map(([request]) => request.url)).toEqual(
			[
				"https://api.deezer.com/album/302127",
				"https://api.deezer.com/album/302127/tracks?limit=100",
				secondPage,
				thirdPage,
			],
		);
	});

	test("loads the full track endpoint when the embedded album tracks are silently truncated", async () => {
		const tracks = [
			...album.tracks.data,
			{ ...album.tracks.data[0], id: 3, track_position: 3 },
		];
		vi.mocked(fetch)
			.mockResolvedValueOnce(
				JSON.stringify({
					...album,
					nb_tracks: 3,
					tracks: { data: [tracks[0]] },
				}),
			)
			.mockResolvedValueOnce(JSON.stringify({ data: tracks }));
		expect((await resolve(url)).tracks).toHaveLength(3);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test("preserves native disc positions and raw feature titles without adding artist prefixes", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce(JSON.stringify({ ...album, nb_tracks: 3 }))
			.mockResolvedValueOnce(
				JSON.stringify({
					data: [
						{
							...album.tracks.data[0],
							id: 1,
							track_position: 1,
							disk_number: 1,
						},
						{
							...album.tracks.data[1],
							id: 2,
							title: "Song [feat. Guest]",
							artist: { name: "Guest" },
							track_position: 1,
							disk_number: 2,
						},
						{
							...album.tracks.data[1],
							id: 3,
							track_position: 2,
							disk_number: 2,
						},
					],
				}),
			);
		const result = await resolve(url);
		expect(
			result.tracks?.map(({ position, title, artists }) => ({
				position,
				title,
				artists,
			})),
		).toEqual([
			{ position: "1.1", title: "One More Time", artists: ["Daft Punk"] },
			{ position: "2.1", title: "Song [feat. Guest]", artists: ["Guest"] },
			{ position: "2.2", title: "Aerodynamic", artists: ["Daft Punk"] },
		]);
	});

	test("separates track attribution from roles and feeds shared feature/guest derivation", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce(JSON.stringify(album))
			.mockResolvedValueOnce(
				JSON.stringify({
					data: [
						{
							...album.tracks.data[0],
							contributors: [
								{ name: "Daft Punk", role: "Main" },
								{ name: "Guest", role: "Featured" },
								{ name: "Writer", role: "Composer" },
							],
						},
						{ ...album.tracks.data[1], artist: { name: "Guest" } },
					],
				}),
			);
		const { tracks = [], artists = [] } = await resolve(url);
		expect(tracks[0]?.artists).toEqual(["Daft Punk", "Guest"]);
		expect(getGuestArtists(tracks, artists)).toEqual([
			{ name: "Guest", positions: ["2"] },
		]);
		expect(
			getSuggestedCredits(tracks).map(({ name, role, positions }) => ({
				name,
				role,
				positions,
			})),
		).toEqual([
			{ name: "Guest", role: "featured", positions: ["1"] },
			{ name: "Writer", role: "composer", positions: ["1"] },
		]);
	});

	test.each([
		{ id: 0 },
		{ id: undefined },
		{ duration: -1 },
		{ track_position: 0 },
		{ disk_number: -1 },
	])("rejects malformed track metadata %j", async (changes) => {
		vi.mocked(fetch)
			.mockResolvedValueOnce(JSON.stringify(album))
			.mockResolvedValueOnce(
				JSON.stringify({
					data: [{ ...album.tracks.data[0], ...changes }, album.tracks.data[1]],
				}),
			);
		await expect(resolve(url)).rejects.toThrow(
			"Could not parse Deezer track 1",
		);
	});
});
