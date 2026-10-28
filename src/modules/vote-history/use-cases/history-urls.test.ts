import { describe, expect, test } from "vitest";

import { getPaginationUrl, getVoteHistoryUrl } from "./history-urls";

describe("getVoteHistoryUrl", () => {
	test.each([
		["music", "/rgenre/vote_history"],
		["film", "/rgenre/film_vote_history"],
		["descriptors", "/rdescriptor/vote_history"],
	])("switches to the %s history for the same user", (_history, path) => {
		expect(
			getVoteHistoryUrl(
				path,
				"?username=movie-fan&show=100&start=200&genre=123",
			),
		).toBe(`${path}?start=0&username=movie-fan`);
	});

	test("omits the username parameter when it is absent", () => {
		expect(getVoteHistoryUrl("/rgenre/vote_history", "?start=100")).toBe(
			"/rgenre/vote_history?start=0",
		);
	});

	test("encodes usernames safely", () => {
		expect(
			getVoteHistoryUrl(
				"/rdescriptor/vote_history",
				"?username=movie+fan%26friend",
			),
		).toBe("/rdescriptor/vote_history?start=0&username=movie+fan%26friend");
	});
});

describe("getPaginationUrl", () => {
	test("preserves the current film history route and query parameters", () => {
		expect(
			getPaginationUrl(
				"/rgenre/film_vote_history",
				"?username=movie-fan&show=100&start=0&genre=123",
				100,
			),
		).toBe(
			"/rgenre/film_vote_history?username=movie-fan&show=100&start=100&genre=123",
		);
	});

	test("changes only start when moving to another page", () => {
		expect(
			getPaginationUrl(
				"/rdescriptor/vote_history",
				"?username=music-fan&show=50&start=100&descriptor=42",
				150,
			),
		).toBe(
			"/rdescriptor/vote_history?username=music-fan&show=50&start=150&descriptor=42",
		);
	});
});
