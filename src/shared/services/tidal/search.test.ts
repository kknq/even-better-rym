import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetch } from "~/shared/utils/fetch";
import { withArtistAlias } from "../search-matching";
import { requestToken } from "./auth";
import { search } from "./search";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));
vi.mock("./auth", () => ({ requestToken: vi.fn() }));

const result = (albums: { id: string; title: string; artist: string }[]) =>
	JSON.stringify({
		data: [
			{
				relationships: {
					albums: { data: albums.map(({ id }) => ({ id, type: "albums" })) },
				},
			},
		],
		included: albums.flatMap(({ id, title, artist }) => [
			{
				id,
				type: "albums",
				attributes: { title },
				relationships: {
					artists: { data: [{ id: `artist-${id}`, type: "artists" }] },
				},
			},
			{ id: `artist-${id}`, type: "artists", attributes: { name: artist } },
		]),
	});

describe("Tidal search", () => {
	beforeEach(() => {
		vi.mocked(fetch).mockReset();
		vi.mocked(requestToken).mockReset().mockResolvedValue({
			access_token: "test-token",
			expires_in: 3600,
			token_type: "Bearer",
		});
	});

	test("uses the query endpoint and reads albums from the result collection", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{ id: "456", title: "Master of Puppets", artist: "Metallica" },
				{ id: "123", title: "A/B", artist: "Björk & friends" },
			]),
		);

		await expect(
			search({
				artist: "Björk & friends",
				title: "A/B",
				serviceRegions: { tidal: "GB" },
			}),
		).resolves.toBe("https://tidal.com/browse/album/123");
		expect(fetch).toHaveBeenCalledWith({
			url: "https://openapi.tidal.com/v2/searchResults",
			method: "GET",
			headers: {
				Authorization: "Bearer test-token",
				Accept: "application/vnd.api+json",
				"Content-Type": "application/vnd.api+json",
			},
			urlParameters: {
				"filter[query]": "Björk & friends A/B",
				explicitFilter: "INCLUDE",
				countryCode: "GB",
				include: "albums,albums.artists",
			},
		});
	});

	test("rejects the reported Metallica false positive for 7Б", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([{ id: "456", title: "Master of Puppets", artist: "Metallica" }]),
		);
		await expect(
			search({ artist: "7Б", artistAlias: "7B", title: "Рок Жив!" }),
		).resolves.toBeUndefined();
	});

	test("matches 7Б's Latin alias and reissue title", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{ id: "109495987", title: "Рок жив! (Переиздание)", artist: "7B" },
			]),
		);
		await expect(
			search({ artist: "7Б", artistAlias: "7B", title: "Рок Жив!" }),
		).resolves.toBe("https://tidal.com/browse/album/109495987");
	});

	test("finds Flesh Cathedral when Tidal spells Svartidauði as Svartidaudi", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{
					id: "103468510",
					title: "De Mysteriis Dom Sathanas",
					artist: "Mayhem",
				},
				{ id: "105391771", title: "Flesh Cathedral", artist: "Svartidaudi" },
			]),
		);
		await expect(
			search({
				artist: "Svartidauði",
				title: "Flesh Cathedral",
				serviceRegions: { tidal: "PL" },
			}),
		).resolves.toBe("https://tidal.com/browse/album/105391771");
		expect(
			vi.mocked(fetch).mock.calls[0][0].urlParameters?.["filter[query]"],
		).toBe("Svartidauði Flesh Cathedral");
		expect(fetch).toHaveBeenCalledOnce();
	});

	test.each([
		["SVARTIDAUÐI", "Svartidaudi"],
		["Björk", "Bjork"],
		["Bjo\u0308rk", "Bjork"],
		["Sólstafir", "Solstafir"],
		["Misþyrming", "Misthyrming"],
		["MØ", "MO"],
		["Łódź", "Lodz"],
		["Æther", "Aether"],
		["Œuvre", "Oeuvre"],
		["Straße", "Strasse"],
		["Đorđe", "Dorde"],
	])("matches a simplified Latin artist spelling: %s / %s", async (artist, tidalArtist) => {
		vi.mocked(fetch).mockResolvedValue(
			result([{ id: "1", title: "Album", artist: tidalArtist }]),
		);
		await expect(search({ artist, title: "Album" })).resolves.toBe(
			"https://tidal.com/browse/album/1",
		);
	});

	test("prefers an exact artist name over a folded spelling collision", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{ id: "1", title: "Album", artist: "MO" },
				{ id: "2", title: "Album", artist: "MØ" },
			]),
		);
		await expect(search({ artist: "MØ", title: "Album" })).resolves.toBe(
			"https://tidal.com/browse/album/2",
		);
	});

	test("still prefers an exact title over a reissue when the artist spelling differs", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{ id: "1", title: "Flesh Cathedral (Reissue)", artist: "Svartidauði" },
				{ id: "2", title: "Flesh Cathedral", artist: "Svartidaudi" },
			]),
		);
		await expect(
			search({ artist: "Svartidauði", title: "Flesh Cathedral" }),
		).resolves.toBe("https://tidal.com/browse/album/2");
	});

	test("recognizes a reissue with a simplified artist spelling", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{ id: "1", title: "Flesh Cathedral (Reissue)", artist: "Svartidaudi" },
			]),
		);
		await expect(
			search({ artist: "Svartidauði", title: "Flesh Cathedral" }),
		).resolves.toBe("https://tidal.com/browse/album/1");
	});

	test.each([
		{ artist: "7Б", candidate: "7B" },
		{ artist: "AC/DC", candidate: "ACDC" },
	])("does not invent aliases or remove meaningful punctuation: %j", async ({
		artist,
		candidate,
	}) => {
		vi.mocked(fetch).mockResolvedValue(
			result([{ id: "1", title: "Album", artist: candidate }]),
		);
		await expect(search({ artist, title: "Album" })).resolves.toBeUndefined();
	});

	test.each([
		{ title: "Flesh Cathedral Live", artist: "Svartidaudi" },
		{ title: "Flesh Cathedral", artist: "Svartidaudi Tribute" },
		{ title: "Flesh Cathedral", artist: "Metallica" },
		{ title: "Flesh Cathedral", artist: "Svarti Daudi" },
	])("retains strict title and artist safeguards: %j", async (album) => {
		vi.mocked(fetch).mockResolvedValue(result([{ id: "1", ...album }]));
		await expect(
			search({ artist: "Svartidauði", title: "Flesh Cathedral" }),
		).resolves.toBeUndefined();
	});

	test("prefers an exact title over a reissue", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{ id: "1", title: "Album (Reissue)", artist: "Artist" },
				{ id: "2", title: "Album", artist: "Artist" },
			]),
		);
		await expect(search({ artist: "Artist", title: "Album" })).resolves.toBe(
			"https://tidal.com/browse/album/2",
		);
	});

	test.each([
		{ title: "Another Album", artist: "Artist" },
		{ title: "Album", artist: "Another Artist" },
		{ title: "Album Live", artist: "Artist" },
	])("rejects mismatched metadata: %j", async (album) => {
		vi.mocked(fetch).mockResolvedValue(result([{ id: "1", ...album }]));
		await expect(
			search({ artist: "Artist", title: "Album" }),
		).resolves.toBeUndefined();
	});

	test("does not accept album IDs without artist and title metadata", async () => {
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({
				data: [{ relationships: { albums: { data: [{ id: "1" }] } } }],
			}),
		);
		await expect(
			search({ artist: "Artist", title: "Album" }),
		).resolves.toBeUndefined();
	});

	test("retries with a supplied alias after unmatched results", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce(
				result([{ id: "1", title: "Master of Puppets", artist: "Metallica" }]),
			)
			.mockResolvedValueOnce(
				result([{ id: "2", title: "Рок жив!", artist: "7B" }]),
			);
		await expect(
			withArtistAlias(search)({
				artist: "7Б",
				artistAlias: "7B",
				title: "Рок Жив!",
			}),
		).resolves.toBe("https://tidal.com/browse/album/2");
		expect(
			vi.mocked(fetch).mock.calls[1][0].urlParameters?.["filter[query]"],
		).toBe("7B Рок Жив!");
	});

	test("surfaces API errors instead of treating them as empty results", async () => {
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({ errors: [{ detail: "Unavailable" }] }),
		);
		await expect(search({ artist: "Artist", title: "Album" })).rejects.toThrow(
			"Tidal search failed: Unavailable",
		);
	});

	test("defaults to the US region", async () => {
		vi.mocked(fetch).mockResolvedValue('{"data":[]}');

		await search({ artist: "Artist", title: "Album" });

		expect(vi.mocked(fetch).mock.calls[0]?.[0].urlParameters?.countryCode).toBe(
			"US",
		);
	});

	test.each([
		"",
		"{}",
		'{"data":[]}',
		'{"data":[{}]}',
		'{"data":[{"relationships":{"albums":{"data":[]}}}]}',
	])("returns no match for an empty result: %s", async (response) => {
		vi.mocked(fetch).mockResolvedValue(response);

		await expect(
			search({ artist: "Artist", title: "Album" }),
		).resolves.toBeUndefined();
	});

	test("propagates HTTP errors rather than reporting no match", async () => {
		vi.mocked(fetch).mockRejectedValue(new Error("HTTP 429"));

		await expect(search({ artist: "Artist", title: "Album" })).rejects.toThrow(
			"HTTP 429",
		);
	});
});
