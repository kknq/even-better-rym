import { describe, expect, it } from "vitest";

import {
	getRatingsPageType,
	isReleaseReviewList,
	preservesListVisibility,
} from "./page-type";

describe("getRatingsPageType", () => {
	it.each([
		["/release/album/example", "release"],
		["/film/example", "film"],
		["/artist/example", "artist"],
		["/films/example", "artist"],
		["/charts/top/album/2026", "chart"],
		["/collection/example", "collection"],
		["/~example/reviews", "profile"],
		["/music-review/example/album/1", "review"],
		["/latest", "review"],
		["/new-music/", "newMusic"],
		["/genre/downtempo", "genre"],
		["/genres/", null],
		["/", "home"],
		["/account/login", null],
	])("classifies %s as %s", (pathname, expected) => {
		expect(getRatingsPageType(pathname)).toBe(expected);
	});
});

describe("isReleaseReviewList", () => {
	it.each([
		["/release/album/example/reviews/", true],
		["/release/album/example/reviews/2/", true],
		["/film/example/reviews/", true],
		["/release/album/example/", false],
		["/~example/reviews/", false],
	])("classifies %s as %s", (pathname, expected) => {
		expect(isReleaseReviewList(pathname)).toBe(expected);
	});
});

describe("preservesListVisibility", () => {
	it.each([
		["collection", "/collection/example", true],
		["review", "/latest", true],
		["release", "/release/album/example/reviews/2/", true],
		["release", "/release/album/example/", false],
		["home", "/", false],
	] as const)("classifies %s at %s as %s", (page, pathname, expected) => {
		expect(preservesListVisibility(page, pathname)).toBe(expected);
	});
});
