import { describe, expect, test } from "vitest";

import { isSearchResult } from "./messages";

describe("isSearchResult", () => {
	test("accepts not-found as a successful search outcome", () => {
		expect(isSearchResult({ status: "not-found" })).toBe(true);
	});

	test("accepts a not-found outcome with diagnostics", () => {
		expect(
			isSearchResult({
				status: "not-found",
				diagnostics: [
					{ stage: "frame-finished", details: '{"status":"not-found"}' },
				],
			}),
		).toBe(true);
	});

	test("accepts a valid found Spotify link", () => {
		expect(
			isSearchResult({
				status: "found",
				url: "https://open.spotify.com/album/3SRxE9NuyRHYLcmCTaCEL3",
			}),
		).toBe(true);
	});

	test("accepts an error outcome for actual search failures", () => {
		expect(
			isSearchResult({
				status: "error",
				message: "Spotify search results did not load",
			}),
		).toBe(true);
	});

	test.each([
		null,
		undefined,
		{},
		{ status: "unknown" },
		{ status: "found" },
		{ status: "found", url: "https://example.com/album/123" },
		{ status: "error" },
		{ status: "not-found", diagnostics: "invalid" },
	])("rejects malformed search outcomes: %s", (result) => {
		expect(isSearchResult(result)).toBe(false);
	});
});
