import { describe, expect, test } from "vitest";

import {
	findBestWikipediaResult,
	getWikipediaArticleUrl,
	toSlug,
} from "./helpers";

describe("toSlug", () => {
	test.each([
		["Side by Side", "Side-by-Side"],
		["Songs by Sinatra", "Songs-by-Sinatra"],
	])("preserves words in %s", (value, expected) => {
		expect(toSlug(value)).toBe(expected);
	});
});

describe("findBestWikipediaResult", () => {
	test("accepts an album article without an artist match", () => {
		const result = findBestWikipediaResult(
			[
				{
					title: "Igor (album)",
					snippet: "A musical release.",
				},
			],
			"Igor",
		);

		expect(result?.title).toBe("Igor (album)");
	});

	test("prefers an album article over a generic or song article", () => {
		expect(
			findBestWikipediaResult(
				[
					{ title: "Igor" },
					{ title: "Igor (song)" },
					{ title: "Igor (Tyler, the Creator album)" },
				],
				"Igor",
			),
		).toEqual({ title: "Igor (Tyler, the Creator album)" });
	});

	test("does not treat a title containing the album name as a match", () => {
		expect(
			findBestWikipediaResult([{ title: "Seasons of Love (album)" }], "Love"),
		).toBeUndefined();
	});
});

test("getWikipediaArticleUrl encodes an article title", () => {
	expect(getWikipediaArticleUrl("A & B")).toBe(
		"https://en.wikipedia.org/wiki/A_%26_B",
	);
});
