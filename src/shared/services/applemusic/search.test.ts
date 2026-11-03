import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetch } from "~/shared/utils/fetch";
import type { ReleaseType } from "../types";
import type { SearchObject } from "./codec";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));

import { search, toRegionalAppleMusicUrl } from "./search";

describe("Apple Music search", () => {
	const metadata = {
		artist: "The Broken Family Band",
		title: "Balls",
		releaseType: "album" as const,
		serviceRegions: { applemusic: "pl" },
	};
	const album = {
		artistId: 120981511,
		artistName: metadata.artist,
		collectionName: metadata.title,
		collectionViewUrl: "https://music.apple.com/us/album/balls/771089028?uo=4",
	};
	const unrelated = {
		artistId: 137057909,
		artistName: "Miley Cyrus",
		collectionName: "Something Beautiful",
		collectionViewUrl:
			"https://music.apple.com/pl/album/something-beautiful/1804974240?uo=4",
	};
	const respond = (...responses: SearchObject[]) => {
		for (const response of responses) {
			vi.mocked(fetch).mockResolvedValueOnce(JSON.stringify(response));
		}
	};

	beforeEach(() => {
		vi.mocked(fetch).mockReset();
	});

	test("rejects the reported false positive and finds Balls in the artist catalog", async () => {
		respond(
			{ results: [unrelated] },
			{ results: [{ artistId: album.artistId, artistName: album.artistName }] },
			{
				results: [
					{ artistId: album.artistId, artistName: album.artistName },
					album,
				],
			},
		);

		await expect(search(metadata)).resolves.toBe(
			"https://music.apple.com/pl/album/balls/771089028?uo=4",
		);
		expect(vi.mocked(fetch).mock.calls.map(([request]) => request)).toEqual([
			{
				url: "https://itunes.apple.com/search",
				method: "GET",
				urlParameters: {
					term: "The Broken Family Band Balls",
					media: "music",
					entity: "album",
					limit: "200",
					country: "pl",
				},
			},
			{
				url: "https://itunes.apple.com/search",
				method: "GET",
				urlParameters: {
					term: metadata.artist,
					media: "music",
					entity: "musicArtist",
					limit: "200",
					country: "pl",
				},
			},
			{
				url: "https://itunes.apple.com/lookup",
				method: "GET",
				urlParameters: {
					id: String(album.artistId),
					entity: "album",
					limit: "200",
					country: "pl",
				},
			},
		]);
	});

	test("scans past unrelated results to a matching album", async () => {
		respond({ results: [unrelated, album] });

		await expect(search(metadata)).resolves.toContain("/pl/album/balls/");
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	test("normalizes case, whitespace, and Unicode compatibility forms", async () => {
		respond({
			results: [
				{
					...album,
					artistName: "  THE   BROKEN FAMILY BAND ",
					collectionName: " ＢＡＬＬＳ ",
				},
			],
		});

		await expect(search(metadata)).resolves.toContain("/pl/album/balls/");
	});

	test.each([
		{ ...album, artistName: "Another Artist" },
		{ ...album, collectionName: "Another Album" },
		{ ...album, artistName: "The Broken Family Band Tribute" },
		{ ...album, collectionName: "Balls Live" },
		{ ...album, collectionName: "Balls (Deluxe Edition)" },
		{ ...album, collectionName: undefined },
		{ ...album, collectionViewUrl: undefined },
	])("does not accept an unverified result: %j", async (candidate) => {
		respond({ results: [candidate] }, { results: [] });

		await expect(search(metadata)).resolves.toBeUndefined();
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test.each<{
		releaseType?: ReleaseType;
		collectionName: string;
		matches: boolean;
	}>([
		{ releaseType: "single", collectionName: "Balls - Single", matches: true },
		{ releaseType: "ep", collectionName: "Balls - EP", matches: true },
		{ releaseType: "album", collectionName: "Balls - Single", matches: false },
		{ releaseType: "ep", collectionName: "Balls - Single", matches: false },
		{ releaseType: "single", collectionName: "Balls - EP", matches: false },
		{ collectionName: "Balls - EP", matches: false },
	])("checks release-type suffixes: %j", async ({
		releaseType,
		collectionName,
		matches,
	}) => {
		respond({ results: [{ ...album, collectionName }] }, { results: [] });

		const result = await search({ ...metadata, releaseType });
		if (matches) expect(result).toContain("/pl/album/balls/");
		else expect(result).toBeUndefined();
	});

	test("requires both matching artist ID and names in the catalog fallback", async () => {
		respond(
			{ results: [] },
			{ results: [{ artistId: album.artistId, artistName: album.artistName }] },
			{
				results: [
					{ ...album, artistId: 999 },
					{ ...album, artistName: "Another Artist" },
					{ ...album, collectionName: "Another Album" },
				],
			},
		);

		await expect(search(metadata)).resolves.toBeUndefined();
	});

	test("skips unrelated artists and continues through exact-name candidates", async () => {
		respond(
			{ results: [] },
			{
				results: [
					{ artistId: 999, artistName: "The Broken Family Band Tribute" },
					{ artistId: 123, artistName: album.artistName },
					{ artistId: album.artistId, artistName: album.artistName },
				],
			},
			{ results: [] },
			{ results: [album] },
		);

		await expect(search(metadata)).resolves.toContain("/pl/album/balls/");
		expect(fetch).toHaveBeenCalledTimes(4);
	});

	test("preserves Apple's URL when no storefront is selected", async () => {
		respond({ results: [album] });

		await expect(
			search({ artist: metadata.artist, title: metadata.title }),
		).resolves.toBe(album.collectionViewUrl);
		expect(
			vi.mocked(fetch).mock.calls[0]?.[0].urlParameters,
		).not.toHaveProperty("country");
	});

	test.each([
		"search",
		"artist search",
		"lookup",
	])("propagates API errors from %s", async (stage) => {
		const artistResult = {
			results: [{ artistId: album.artistId, artistName: album.artistName }],
		};
		if (stage !== "search") respond({ results: [] });
		if (stage === "lookup") respond(artistResult);
		respond({ results: [], errorMessage: "Service unavailable" });

		await expect(search(metadata)).rejects.toThrow(
			"Apple Music search failed: Service unavailable",
		);
	});

	test("propagates network errors", async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("HTTP 429"));

		await expect(search(metadata)).rejects.toThrow("HTTP 429");
	});
});

describe("toRegionalAppleMusicUrl", () => {
	test("uses the selected storefront while preserving the item URL", () => {
		expect(
			toRegionalAppleMusicUrl(
				"https://music.apple.com/us/album/album-name/123456789?i=987654321",
				"ca",
			),
		).toBe("https://music.apple.com/ca/album/album-name/123456789?i=987654321");
	});

	// Opening a geo.music.apple.com link from Safari leaves a blank tab behind.
	test("keeps the music.apple.com host", () => {
		const url = new URL(
			toRegionalAppleMusicUrl(
				"https://music.apple.com/us/album/album-name/123456789",
				"ca",
			),
		);

		expect(url.hostname).toBe("music.apple.com");
	});

	test("leaves non-Apple Music URLs unchanged", () => {
		expect(toRegionalAppleMusicUrl("https://example.com/album", "ca")).toBe(
			"https://example.com/album",
		);
	});
});
