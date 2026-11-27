import { expect, test, vi } from "vitest";

import {
	getAlbumSearchQuery,
	normalizeSearchArtist,
	normalizeSearchText,
	withArtistAlias,
} from "./search-matching";
import type { SearchFunction } from "./types";

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
