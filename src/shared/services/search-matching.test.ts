import { expect, test, vi } from "vitest";

import {
	getAlbumSearchQuery,
	getSearchTitleVariants,
	isEditionSuffix,
	isEditionTitle,
	isExpandedTitle,
	isSoundtrackTitle,
	normalizeSearchArtist,
	normalizeSearchText,
	normalizeSearchTitle,
	withArtistAlias,
	withSearchTitleVariants,
} from "./search-matching";
import type { SearchFunction } from "./types";

test.each([
	" (deluxe edition)",
	" [deluxe version]",
	" - remastered 2020",
	" (2020 remaster)",
	" (deluxe edition) [remastered version]",
	" \t(deluxe\nedition)",
])("recognizes edition suffixes: %s", (suffix) => {
	expect(isEditionSuffix(suffix)).toBe(true);
	expect(isEditionTitle(`Album${suffix}`, "Album")).toBe(true);
});

test.each([
	"",
	" (live)",
	" (deluxe edition) live",
	" (remastered 20201)",
	" deluxe edition",
])("rejects non-edition suffixes: %s", (suffix) => {
	expect(isEditionSuffix(suffix)).toBe(false);
	expect(isEditionTitle(`Album${suffix}`, "Album")).toBe(false);
});

test("rejects long malformed suffixes without backtracking across editions", () => {
	expect(isEditionSuffix(`${" (deluxe edition)".repeat(20_000)}!`)).toBe(false);
	expect(isEditionSuffix(`${" ".repeat(200_000)}!`)).toBe(false);
});

test.each([
	"Soundtrack",
	"Original Soundtrack",
	"Official Soundtrack",
	"Original Motion Picture Soundtrack",
	"Original Video Game Soundtrack",
])("recognizes shared soundtrack titles: %s", (label) => {
	expect(isSoundtrackTitle(`Album (${label})`, "Album")).toBe(true);
});

test.each([
	"Album Live (Official Soundtrack)",
	"Album (Unofficial Soundtrack)",
	"Album (Original Soundtrack) [Deluxe Edition]",
])("rejects unrelated soundtrack titles: %s", (candidate) => {
	expect(isSoundtrackTitle(candidate, "Album")).toBe(false);
});

test("shared suffix matching preserves base titles and rejects empty titles", () => {
	expect(isEditionTitle("Another Album (Deluxe Edition)", "Album")).toBe(false);
	expect(isEditionTitle("(Deluxe Edition)", "")).toBe(false);
	expect(isSoundtrackTitle("(Original Soundtrack)", "")).toBe(false);
	expect(
		isEditionTitle("Album Vol. 1 (Deluxe Edition)", "Album Volume 1"),
	).toBe(true);
});

test.each([
	" (Expanded Edition)",
	" [Expanded]",
	" - Expanded Edition",
])("accepts a complete expanded suffix: %s", (suffix) =>
	expect(isExpandedTitle(`Saturday Night${suffix}`, "Saturday Night")).toBe(
		true,
	));

test.each([
	"Get Down Saturday Night (Expanded Edition)",
	"Saturday Night Live (Expanded Edition)",
	"Saturday Night (Expanded Edition) Vol. 2",
])("rejects unrelated expanded titles: %s", (candidate) =>
	expect(isExpandedTitle(candidate, "Saturday Night")).toBe(false));

test.each([
	["Album: Volume 1 - Music", "Album, Vol. 1: Music"],
	["Album Vol. 2", "Album Volume 2"],
	["Album vol 3", "Album Volume 3"],
])("matches numbered volume title variants: %s / %s", (left, right) => {
	expect(normalizeSearchTitle(left)).toBe(normalizeSearchTitle(right));
});

test.each([
	["Album Volume 1", "Album Vol. 2"],
	["Album Volume 1 - Music", "Album Vol. 1 - Score"],
	["Volume Control", "Vol. Control"],
	["Album: Music", "Album, Music"],
])("preserves distinct titles: %s / %s", (left, right) => {
	expect(normalizeSearchTitle(left)).not.toBe(normalizeSearchTitle(right));
});

test("generates service and RYM volume spellings in both directions", () => {
	const rym = "The Music of Grand Theft Auto V: Volume 1 - Original Music";
	const service = "The Music of Grand Theft Auto V, Vol. 1: Original Music";
	expect(getSearchTitleVariants(rym)).toContain(service);
	expect(getSearchTitleVariants(service)).toContain(rym);
	expect(getSearchTitleVariants("Volume Control")).toEqual(["Volume Control"]);
});

test("title retries stop at the first match and preserve metadata", async () => {
	const search = vi
		.fn<SearchFunction>()
		.mockResolvedValueOnce(undefined)
		.mockResolvedValueOnce("found");
	const metadata = {
		artist: "Artist",
		title: "Album Volume 1",
		serviceRegions: { tidal: "PL" },
	};
	await expect(withSearchTitleVariants(search)(metadata)).resolves.toBe(
		"found",
	);
	expect(search.mock.calls.map(([input]) => input.title)).toEqual([
		"Album Volume 1",
		"Album Vol. 1",
	]);
	expect(search.mock.calls[1][0]).toEqual({
		...metadata,
		title: "Album Vol. 1",
	});
});

test("title retries propagate errors", async () => {
	const search = vi
		.fn<SearchFunction>()
		.mockRejectedValue(new Error("HTTP 429"));
	await expect(
		withSearchTitleVariants(search)({
			artist: "Artist",
			title: "Album Volume 1",
		}),
	).rejects.toThrow("HTTP 429");
	expect(search).toHaveBeenCalledOnce();
});

test.each([
	"Various Artists",
	"VARIOUS ARTISTS",
	" various  artists ",
])("searches by title alone for %s", (artist) => {
	expect(getAlbumSearchQuery(artist, "Heart of Gold")).toBe("Heart of Gold");
});

test("retains the artist for named artists and similarly named groups", () => {
	expect(getAlbumSearchQuery("Neil Young", "Harvest")).toBe(
		"Neil Young Harvest",
	);
	expect(getAlbumSearchQuery("Various Artists Tribute", "Album")).toBe(
		"Various Artists Tribute Album",
	);
});

test.each([
	["Svartidauði", "Svartidaudi"],
	["Björk", "Bjork"],
	["Bjo\u0308rk", "Bjork"],
	["Misþyrming", "Misthyrming"],
	["MØ", "MO"],
	["Æther", "Aether"],
	["Straße", "Strasse"],
	["Łódź", "Lodz"],
	["Œuvre", "Oeuvre"],
	["Đorđe", "Dorde"],
])("normalizes artist spelling in either direction: %s / %s", (original, simplified) => {
	expect(normalizeSearchArtist(original)).toBe(
		normalizeSearchArtist(simplified),
	);
});

test.each([
	["7Б", "7B"],
	["AC/DC", "ACDC"],
	["Artist", "Artist Tribute"],
])("preserves distinct names: %s / %s", (left, right) => {
	expect(normalizeSearchArtist(left)).not.toBe(normalizeSearchArtist(right));
});

test("does not change strict title normalization", () => {
	expect(normalizeSearchText("Söngvar")).not.toBe(
		normalizeSearchText("Songvar"),
	);
});

test("tries original spelling, explicit alias, then simplified spellings once each", async () => {
	const search = vi.fn<SearchFunction>().mockResolvedValue(undefined);
	const metadata = {
		artist: "Björk",
		artistAlias: "MØ",
		title: "Album",
		serviceRegions: { tidal: "PL" },
	};
	await expect(withArtistAlias(search)(metadata)).resolves.toBeUndefined();
	expect(search.mock.calls.map(([input]) => input.artist)).toEqual([
		"Björk",
		"MØ",
		"bjork",
		"mo",
	]);
	expect(
		search.mock.calls
			.slice(1)
			.every(
				([input]) =>
					input.artistAlias === "Björk" &&
					input.title === metadata.title &&
					input.serviceRegions === metadata.serviceRegions,
			),
	).toBe(true);
});

test("does not repeat equivalent alias or simplified-name searches", async () => {
	const search = vi.fn<SearchFunction>().mockResolvedValue(undefined);
	await withArtistAlias(search)({
		artist: "Svartidauði",
		artistAlias: "SVARTIDAUDI",
		title: "Album",
	});
	expect(search.mock.calls.map(([input]) => input.artist)).toEqual([
		"Svartidauði",
		"SVARTIDAUDI",
	]);
});

test("returns immediately when the original spelling matches", async () => {
	const search = vi
		.fn<SearchFunction>()
		.mockResolvedValue("https://example.com/album");
	await expect(
		withArtistAlias(search)({ artist: "Svartidauði", title: "Album" }),
	).resolves.toBe("https://example.com/album");
	expect(search).toHaveBeenCalledOnce();
});

test("does not retry or hide errors", async () => {
	const search = vi
		.fn<SearchFunction>()
		.mockRejectedValue(new Error("HTTP 429"));
	await expect(
		withArtistAlias(search)({ artist: "Svartidauði", title: "Album" }),
	).rejects.toThrow("HTTP 429");
	expect(search).toHaveBeenCalledOnce();
});
