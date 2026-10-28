// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import * as cache from "~/shared/utils/cache";
import { fetchInPage } from "~/shared/utils/fetch";
import {
	getArtistId,
	getSearchUrl,
	loadSearchHint,
	parseSearchHint,
} from "./data";

vi.mock("~/shared/utils/cache", () => ({
	get: vi.fn(),
	set: vi.fn(),
}));
vi.mock("~/shared/utils/fetch", () => ({
	fetchInPage: vi.fn(),
}));

// Relevant structure from the saved RYM search page, including its nested table.
const result = (id: string, hint: string | null): string => `
	<table><tr class="infobox">
		<td class="page_search_img_cell"></td>
		<td>
			<table><tr><td><b>
				<a href="/artist/xtc" class="searchpage artist" title="[Artist${id}]">XTC</a>
			</b></td><td><span class="smallgray">[Artist${id}]</span></td></tr></table>
			<span class="subinfo">
				a.k.a: The Dukes of Stratosphear<br>
				<a class="smallgreen" href="/genre/new-wave/">New Wave</a><br>
				<div><span class="ui_flag" title="United Kingdom"></span> Formed 1972</div>
				${hint === null ? "" : `<div><i class="far fa-question-circle"></i> ${hint}</div>`}
			</span>
		</td>
	</tr></table>
`;
const results = (content: string): string =>
	`<div class="page_search_results">${content}</div>`;
const html = results(result("63", "English New Wave band"));

beforeEach(() => {
	vi.resetAllMocks();
	document.body.innerHTML = "";
	vi.mocked(fetchInPage).mockResolvedValue(html);
});

describe("artist identity", () => {
	test("reads the profile shortcut, not a related artist's link", () => {
		document.body.innerHTML = `
			<a title="[Artist20054]">Andy Partridge</a>
			<div class="artist_page"><input class="rym_shortcut" value="[Artist63]"></div>
		`;
		expect(getArtistId(document)).toBe("63");
	});

	test.each([
		"",
		"[Album63]",
		"[Artist0]",
		"[Artist-1]",
		"[Artist63]extra",
	])("ignores a missing or invalid artist shortcut: %s", (value) => {
		document.body.innerHTML = `<div class="artist_page"><input class="rym_shortcut"></div>`;
		const shortcut = document.querySelector("input");
		if (!shortcut) throw new Error("Missing shortcut");
		shortcut.value = value;
		expect(getArtistId(document)).toBeUndefined();
	});

	test("constructs an artist-ID search rather than a name search", () => {
		expect(getSearchUrl("63")).toBe(
			"https://rateyourmusic.com/search?searchterm=%5BArtist63%5D&searchtype=a",
		);
	});
});

describe("parseSearchHint", () => {
	test("extracts only the hint, not aliases, genres, country or dates", () => {
		expect(parseSearchHint(html, "63")).toBe("English New Wave band");
	});

	test("matches the exact artist even when it is not the first result", () => {
		expect(
			parseSearchHint(
				results(result("630", "Wrong artist") + result("63", "Correct artist")),
				"63",
			),
		).toBe("Correct artist");
	});

	test("decodes entities and normalizes whitespace without importing markup", () => {
		expect(
			parseSearchHint(
				results(result("63", "  English &amp; Welsh\n <b>New Wave</b> band ")),
				"63",
			),
		).toBe("English & Welsh New Wave band");
	});

	test("does not use another result's hint when this artist has no hint", () => {
		expect(
			parseSearchHint(
				results(result("63", null) + result("630", "Wrong artist")),
				"63",
			),
		).toBeNull();
	});

	test.each([
		"<html><title>Verify you are human</title></html>",
		results(result("630", "Wrong artist")),
	])("rejects a blocked or unmatched page instead of caching an empty hint", (body) => {
		expect(() => parseSearchHint(body, "63")).toThrow(
			"Search results did not contain [Artist63]",
		);
	});
});

describe("loadSearchHint", () => {
	test("fetches in the page's session and caches a successful result for a day", async () => {
		await expect(loadSearchHint("63")).resolves.toBe("English New Wave band");
		expect(fetchInPage).toHaveBeenCalledWith({
			url: getSearchUrl("63"),
			credentials: "include",
		});
		expect(cache.set).toHaveBeenCalledWith(
			"artist-search-hint.63",
			"English New Wave band",
			86_400_000,
		);
	});

	test.each([
		"Cached hint",
		null,
	])("reuses cached hints and confirmed absences: %s", async (cached) => {
		vi.mocked(cache.get).mockResolvedValue(cached);
		await expect(loadSearchHint("63")).resolves.toBe(cached);
		expect(cache.get).toHaveBeenCalledWith("artist-search-hint.63");
		expect(fetchInPage).not.toHaveBeenCalled();
	});

	test.each([
		"",
		"<title>403 Forbidden</title>",
		"<title>Verify you are human</title>",
	])("does not cache empty or blocked page responses: %s", async (body) => {
		vi.mocked(fetchInPage).mockResolvedValue(body);
		await expect(loadSearchHint("63")).rejects.toThrow();
		expect(cache.set).not.toHaveBeenCalled();
	});

	test("propagates request errors without caching them", async () => {
		vi.mocked(fetchInPage).mockRejectedValue(new Error("Offline"));
		await expect(loadSearchHint("63")).rejects.toThrow("Offline");
		expect(cache.set).not.toHaveBeenCalled();
	});

	test("caches a confirmed missing hint", async () => {
		vi.mocked(fetchInPage).mockResolvedValue(results(result("63", null)));
		await expect(loadSearchHint("63")).resolves.toBeNull();
		expect(cache.set).toHaveBeenCalledWith(
			"artist-search-hint.63",
			null,
			86_400_000,
		);
	});
});
