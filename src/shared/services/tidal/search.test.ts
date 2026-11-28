import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetch } from "~/shared/utils/fetch";
import { withArtistAlias } from "../search-matching";
import { requestToken } from "./auth";
import { search } from "./search";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));
vi.mock("./auth", () => ({ requestToken: vi.fn() }));

const result = (
	albums: { id: string; title: string; artist: string | string[] }[],
) =>
	JSON.stringify({
		data: [
			{
				relationships: {
					albums: { data: albums.map(({ id }) => ({ id, type: "albums" })) },
				},
			},
		],
		included: albums.flatMap(({ id, title, artist }) => {
			const artists = typeof artist === "string" ? [artist] : artist;
			return [
				{
					id,
					type: "albums",
					attributes: { title },
					relationships: {
						artists: {
							data: artists.map((_, index) => ({
								id: `artist-${id}-${index}`,
								type: "artists",
							})),
						},
					},
				},
				...artists.map((name, index) => ({
					id: `artist-${id}-${index}`,
					type: "artists",
					attributes: { name },
				})),
			];
		}),
	});

describe("Tidal search", () => {
	test.each([
		false,
		true,
	])("selects Saturday Night's expanded edition only as a fallback (standard=%s)", async (standard) => {
		vi.mocked(fetch).mockResolvedValueOnce(
			result([
				{
					id: "wrong",
					title: "Saturday Night (Expanded Edition)",
					artist: "Another Artist",
				},
				{
					id: "251353160",
					title: "Saturday Night (Expanded Edition)",
					artist: "Oliver Cheatham",
				},
				...(standard
					? [{ id: "1", title: "Saturday Night", artist: "Oliver Cheatham" }]
					: []),
			]),
		);
		await expect(
			search({ artist: "Oliver Cheatham", title: "Saturday Night" }),
		).resolves.toBe(
			`https://tidal.com/browse/album/${standard ? "1" : "251353160"}`,
		);
	});

	beforeEach(() => {
		vi.mocked(fetch).mockReset();
		vi.mocked(requestToken).mockReset().mockResolvedValue({
			access_token: "test-token",
			expires_in: 3600,
			token_type: "Bearer",
		});
	});

	test("retries GTA V's service title spelling without confusing its volumes", async () => {
		const title = "The Music of Grand Theft Auto V: Volume 1 - Original Music";
		vi.mocked(fetch)
			.mockResolvedValueOnce(result([]))
			.mockResolvedValueOnce(result([]))
			.mockResolvedValueOnce(
				result([
					{
						id: "261445586",
						title: "The Music of Grand Theft Auto V, Vol. 2: The Score",
						artist: "Various Artists",
					},
					{
						id: "261443234",
						title: "The Music of Grand Theft Auto V, Vol. 1: Original Music",
						artist: "Various Artists",
					},
				]),
			);
		await expect(
			search({
				artist: "Various Artists",
				title,
				serviceRegions: { tidal: "PL" },
			}),
		).resolves.toBe("https://tidal.com/browse/album/261443234");
		expect(vi.mocked(fetch).mock.calls[2][0].urlParameters).toMatchObject({
			"filter[query]":
				"The Music of Grand Theft Auto V, Vol. 1: Original Music",
			countryCode: "PL",
		});
	});

	test("does not substitute another volume after all query retries", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([{ id: "2", title: "Album Vol. 2", artist: "Artist" }]),
		);
		await expect(
			search({ artist: "Artist", title: "Album Volume 1" }),
		).resolves.toBeUndefined();
	});

	test.each([
		["Ghostface Killah", "MF Doom"],
		["MF DOOM", "Ghostface Killah"],
	])("matches Chinatown Wars' separate artist credits: %j", async (...artists) => {
		const title = "Grand Theft Auto: Chinatown Wars";
		vi.mocked(fetch).mockResolvedValue(
			result([{ id: "261447549", title, artist: artists }]),
		);
		await expect(
			search({
				artist: "Ghostface Killah & Doom",
				title,
				serviceRegions: { tidal: "PL" },
			}),
		).resolves.toBe("https://tidal.com/browse/album/261447549");
	});

	test("matches separate collaborators through an explicit RYM alias", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{ id: "1", title: "Album", artist: ["Ghostface Killah", "MF Doom"] },
			]),
		);
		await expect(
			search({
				artist: "DOOMSTARKS",
				artistAlias: "Ghostface Killah & Doom",
				title: "Album",
			}),
		).resolves.toBe("https://tidal.com/browse/album/1");
	});

	test.each([
		["Alpha & Beta", ["Alpha", "DJ Beta"]],
		["Beta & Alpha", ["DJ Beta", "Alpha"]],
		["Alpha & Beta & Gamma", ["Alpha", "DJ Beta", "MC Gamma"]],
	])("matches prefixed collaborator names without artist-specific aliases: %s", async (artist, names) => {
		vi.mocked(fetch).mockResolvedValue(
			result([{ id: "1", title: "Album", artist: names }]),
		);
		await expect(search({ artist, title: "Album" })).resolves.toBe(
			"https://tidal.com/browse/album/1",
		);
	});

	test.each([
		["Alpha & Beta", ["DJ Alpha", "DJ Beta"]],
		["Alpha & Beta", ["Alphabetabeta", "Beta Tribute"]],
	])("rejects collaborations without an exact participant: %s / %j", async (artist, names) => {
		vi.mocked(fetch).mockResolvedValue(
			result([{ id: "1", title: "Album", artist: names }]),
		);
		await expect(search({ artist, title: "Album" })).resolves.toBeUndefined();
	});

	test.each([
		["Ghostface Killah"],
		["MF Doom"],
		["Ghostface Killah", "Another Artist"],
		["Ghostface Killah", "MF Doom Tribute"],
		["Ghostface Killah", "MF Doom", "Another Artist"],
	])("falls back to an exact participant despite different remaining credits: %j", async (...artists) => {
		vi.mocked(fetch).mockResolvedValue(
			result([{ id: "1", title: "Album", artist: artists }]),
		);
		await expect(
			search({
				artist: "Ghostface Killah & MF Doom",
				title: "Album",
			}),
		).resolves.toBe("https://tidal.com/browse/album/1");
	});

	test("finds Chinatown Wars when RYM uses a completely different collaborator alias", async () => {
		const title = "Grand Theft Auto: Chinatown Wars";
		vi.mocked(fetch).mockResolvedValue(
			result([
				{ id: "261447549", title, artist: ["Ghostface Killah", "MF Doom"] },
			]),
		);
		await expect(
			search({
				artist: "Ghostface Killah & King Geedorah",
				title,
			}),
		).resolves.toBe("https://tidal.com/browse/album/261447549");
	});

	test("prefers the complete collaboration over a one-participant match", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{
					id: "1",
					title: "Album",
					artist: ["Ghostface Killah", "Another Artist"],
				},
				{ id: "2", title: "Album", artist: ["Ghostface Killah", "MF Doom"] },
			]),
		);
		await expect(
			search({
				artist: "Ghostface Killah & Doom",
				title: "Album",
			}),
		).resolves.toBe("https://tidal.com/browse/album/2");
	});

	test("requires an exact title for the one-participant fallback", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{
					id: "1",
					title: "Album (Reissue)",
					artist: ["Ghostface Killah", "MF Doom"],
				},
			]),
		);
		await expect(
			search({
				artist: "Ghostface Killah & King Geedorah",
				title: "Album",
			}),
		).resolves.toBeUndefined();
	});

	test("requires an exact title for the separate-credit fallback", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{
					id: "1",
					title: "Album Live",
					artist: ["Ghostface Killah", "MF Doom"],
				},
			]),
		);
		await expect(
			search({
				artist: "Ghostface Killah & Doom",
				title: "Album",
			}),
		).resolves.toBeUndefined();
	});

	test("prefers an intact artist credit to the collaboration fallback", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{ id: "1", title: "Album", artist: ["Simon", "Garfunkel"] },
				{ id: "2", title: "Album", artist: "Simon & Garfunkel" },
			]),
		);
		await expect(
			search({
				artist: "Simon & Garfunkel",
				title: "Album",
			}),
		).resolves.toBe("https://tidal.com/browse/album/2");
	});

	test("does not accept a partial participant name", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{
					id: "1",
					title: "Album",
					artist: ["Belle Tribute", "Another Artist"],
				},
			]),
		);
		await expect(
			search({
				artist: "Belle & Sebastian",
				title: "Album",
			}),
		).resolves.toBeUndefined();
	});

	test("finds the Various Artists tribute using its title alone in the preferred region", async () => {
		const title =
			"Heart of Gold: The Songs of Neil Young, Vol. 3 - Into the Black";
		vi.mocked(fetch).mockResolvedValue(
			result([
				{
					id: "562003441",
					title:
						"Heart of Gold: The Songs of Neil Young, Vol. 2 - Out of the Blue",
					artist: "Various Artists",
				},
				{ id: "wrong-artist", title, artist: "Neil Young" },
				{ id: "562003728", title, artist: "Various Artists" },
			]),
		);
		await expect(
			search({
				artist: "Various Artists",
				title,
				serviceRegions: { tidal: "PL" },
			}),
		).resolves.toBe("https://tidal.com/browse/album/562003728");
		expect(vi.mocked(fetch).mock.calls[0][0].urlParameters).toMatchObject({
			"filter[query]": title,
			countryCode: "PL",
		});
	});

	test("does not substitute another tribute volume for a Various Artists release", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{
					id: "562003441",
					title:
						"Heart of Gold: The Songs of Neil Young, Vol. 2 - Out of the Blue",
					artist: "Various Artists",
				},
			]),
		);
		await expect(
			search({
				artist: "Various Artists",
				title:
					"Heart of Gold: The Songs of Neil Young, Vol. 3 - Into the Black",
			}),
		).resolves.toBeUndefined();
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

	test.each([
		"Original Motion Picture Soundtrack",
		"Original Video Game Soundtrack",
		"Original Soundtrack",
		"Official Soundtrack",
		"Soundtrack",
	])("finds The Dog and the Fountain with the %s suffix", async (suffix) => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{
					id: "301961458",
					title: `The Dog and the Fountain (${suffix})`,
					artist: "Avith Ortega",
				},
			]),
		);
		await expect(
			search({
				artist: "Avith Ortega",
				title: "The Dog and the Fountain",
				serviceRegions: { tidal: "PL" },
			}),
		).resolves.toBe("https://tidal.com/browse/album/301961458");
	});

	test("finds Vice City's Various Artists video game soundtrack", async () => {
		const title = "Grand Theft Auto: Vice City - Music from Radio Espantoso";
		vi.mocked(fetch).mockResolvedValue(
			result([
				{
					id: "wrong",
					title: `${title} (Original Video Game Soundtrack)`,
					artist: ["Alpha Banditos", "Tres Apenas como eso", "Unaesta"],
				},
				{
					id: "22211851",
					title: `${title} (Original Video Game Soundtrack)`,
					artist: "Various Artists",
				},
			]),
		);
		await expect(
			search({
				artist: "Various Artists",
				title,
				serviceRegions: { tidal: "PL" },
			}),
		).resolves.toBe("https://tidal.com/browse/album/22211851");
		expect(vi.mocked(fetch).mock.calls[0][0].urlParameters).toMatchObject({
			"filter[query]": title,
			countryCode: "PL",
		});
	});

	test("finds HEALTH's Arena War official soundtrack in the preferred region", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{
					id: "wrong",
					title: "Grand Theft Auto Online: Arena War (Official Soundtrack)",
					artist: "Another Artist",
				},
				{
					id: "104719576",
					title: "Grand Theft Auto Online: Arena War (Official Soundtrack)",
					artist: "HEALTH",
				},
			]),
		);
		await expect(
			search({
				artist: "HEALTH",
				title: "Grand Theft Auto Online: Arena War",
				serviceRegions: { tidal: "PL" },
			}),
		).resolves.toBe("https://tidal.com/browse/album/104719576");
		expect(vi.mocked(fetch).mock.calls[0][0].urlParameters?.countryCode).toBe(
			"PL",
		);
	});

	test("prefers the exact title over an official soundtrack", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{ id: "1", title: "Album (Official Soundtrack)", artist: "Artist" },
				{ id: "2", title: "Album", artist: "Artist" },
			]),
		);
		await expect(search({ artist: "Artist", title: "Album" })).resolves.toBe(
			"https://tidal.com/browse/album/2",
		);
	});

	test("prefers an exact title even when the soundtrack has the exact artist spelling", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([
				{ id: "1", title: "Album (Original Soundtrack)", artist: "Björk" },
				{ id: "2", title: "Album", artist: "Bjork" },
			]),
		);
		await expect(search({ artist: "Björk", title: "Album" })).resolves.toBe(
			"https://tidal.com/browse/album/2",
		);
	});

	test.each([
		{ title: "Album (Original Soundtrack)", artist: "Another Artist" },
		{ title: "Album Live (Original Soundtrack)", artist: "Artist" },
		{ title: "Album (Original Soundtrack) Deluxe", artist: "Artist" },
		{ title: "Album (Original Soundtrack, Vol. 2)", artist: "Artist" },
		{ title: "Album (Unofficial Soundtrack)", artist: "Artist" },
		{ title: "Album (Official Soundtrack) Live", artist: "Artist" },
		{ title: "Album (Official Soundtrack)", artist: "Another Artist" },
	])("rejects unrelated soundtrack matches: %j", async (album) => {
		vi.mocked(fetch).mockResolvedValue(result([{ id: "1", ...album }]));
		await expect(
			search({ artist: "Artist", title: "Album" }),
		).resolves.toBeUndefined();
	});

	test("does not match a soundtrack when the requested title is empty", async () => {
		vi.mocked(fetch).mockResolvedValue(
			result([{ id: "1", title: " (Original Soundtrack)", artist: "Artist" }]),
		);
		await expect(
			search({ artist: "Artist", title: "" }),
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
			.mockResolvedValueOnce(result([]))
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
			vi.mocked(fetch).mock.calls[2][0].urlParameters?.["filter[query]"],
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
