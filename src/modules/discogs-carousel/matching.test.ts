import { describe, expect, test } from "vitest";

import type { ReleaseIssue } from "~/shared/release-data";

import { findBestReleaseMatch } from "~/shared/services/discogs/matching";

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
	test.each([
		{ format: ["Vinyl"], year: 1990 },
		{ format: ["CD"], year: 2000 },
		{ format: ["CD"], year: undefined },
	])("rejects unverified editions without a catalogue number: %j", (edition) => {
		expect(
			findBestReleaseMatch(
				{
					...edition,
					title: "Example Artist - Example Album",
				},
				{ ...issue, catalogNumber: "", format: "CD" },
			),
		).toBe(-1);
	});

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

	test("matches The Will of Tongues despite the different label names on RYM and Discogs", () => {
		expect(
			findBestReleaseMatch(
				{
					catno: "LMXIIICD",
					label: ["Late Music"],
					title: "Sarah Davachi - The Will Of Tongues",
					year: 2026,
					country: "US",
					format: ["CD", "Album"],
					resource_url: "https://api.discogs.com/releases/38269599",
				},
				{
					catalogNumber: "LMXIIICD",
					label: "Late",
					artist: "Sarah Davachi",
					title: "The Will of Tongues",
					year: 2026,
					country: "",
					format: "CD ",
				},
			),
		).toBe(130);
	});

	test("prefers an exact label match over a different label name", () => {
		const result = {
			catno: "ST-123",
			title: "Example Artist - Example Album",
		};
		expect(
			findBestReleaseMatch({ ...result, label: ["Example Records"] }, issue),
		).toBeGreaterThan(
			findBestReleaseMatch({ ...result, label: ["Example"] }, issue),
		);
	});

	test.each([
		"artist",
		"title",
	] as const)("rejects a different label when the issue has no %s", (field) => {
		expect(
			findBestReleaseMatch(
				{
					catno: "ST-123",
					label: ["Different Records"],
					title: "Example Artist - Example Album",
				},
				{ ...issue, [field]: "" },
			),
		).toBe(-1);
	});

	test.each([
		"Different Artist - Example Album",
		"Example Artist - Different Album",
	])("rejects a different label and mismatched identity: %s", (title) => {
		expect(
			findBestReleaseMatch(
				{ catno: "ST-123", label: ["Different Records"], title },
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
