import { describe, expect, test } from "vitest";

import type { ReleaseIssue } from "~/shared/release-data";

import { findBestReleaseMatch } from "./matching";

const issue: ReleaseIssue = {
	catalogNumber: "ST-123",
	country: "US",
	format: "Vinyl",
	label: "Example Records",
	artist: "Example Artist",
	title: "Example Album",
	year: 1990,
};

describe("findBestReleaseMatch", () => {
	test("accepts a result matching the catalogue number, label, artist, and title", () => {
		expect(
			findBestReleaseMatch(
				{
					catno: "ST 123",
					label: ["Example Records"],
					title: "Example Artist - Example Album",
				},
				issue,
			),
		).toBeGreaterThanOrEqual(0);
	});

	test("rejects another release with a reused catalogue number", () => {
		expect(
			findBestReleaseMatch(
				{
					catno: "ST123",
					label: ["Different Records"],
					title: "Different Artist - Different Album",
				},
				issue,
			),
		).toBe(-1);
	});

	test("rejects results without an exact catalogue number", () => {
		expect(
			findBestReleaseMatch(
				{
					catno: "ST-124",
					label: ["Example Records"],
					title: "Example Artist - Example Album",
				},
				issue,
			),
		).toBe(-1);
	});

	test("rejects catalogue-only candidates when the issue has no identity metadata", () => {
		expect(
			findBestReleaseMatch(
				{
					catno: "ST-123",
					label: ["Example Records"],
				},
				{ ...issue, label: "", artist: "", title: "" },
			),
		).toBe(-1);
	});
});
