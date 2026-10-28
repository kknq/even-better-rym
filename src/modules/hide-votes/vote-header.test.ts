import { describe, expect, it } from "vitest";

import { formatVoteHeader, hideVoteStatsHtml } from "./vote-header";

describe("formatVoteHeader", () => {
	it("adds total votes and percentage to genre vote counts", () => {
		expect(
			formatVoteHeader(
				"<b>voted for:</b> (22) :",
				22,
				10,
				"<b>voted for:</b> (22) :",
				false,
			),
		).toBe("<b>voted for:</b> (22/32, 68.8%) :");
	});

	it("adds percentage after the score on descriptor pages", () => {
		expect(
			formatVoteHeader(
				"<b>voted against:</b> (7):",
				3,
				7,
				'<b>voted against:</b> (7): <span title="unweighted degree average">2.1</span>',
				false,
			),
		).toBe("<b>voted against:</b> (7): 7/10, 70.0%");
	});

	it("returns the original header when vote stats are hidden", () => {
		const header = "<b>voted for:</b>";

		expect(formatVoteHeader(header, 22, 10, "(22)", true)).toBe(header);
	});

	it("removes empty descriptor-stat brackets and their colon", () => {
		expect(
			formatVoteHeader(
				"<b>voted for:</b> ():",
				22,
				10,
				"<b>voted for:</b> ():",
				true,
			),
		).toBe("<b>voted for:</b>");
	});
});

describe("hideVoteStatsHtml", () => {
	it("removes parenthesized scores, percentages, and empty parentheses", () => {
		expect(
			hideVoteStatsHtml(
				'<b>voted for:</b> (<span title="unweighted degree average">4.5</span>) (75%) ()',
			),
		).toBe("<b>voted for:</b>   ");
	});

	it("removes a standalone descriptor degree-average span", () => {
		expect(
			hideVoteStatsHtml(
				'<b>voted for:</b> <span title="unweighted degree average">1.2</span>',
			),
		).toBe("<b>voted for:</b> ");
	});

	it("preserves vote user links while removing their score metadata", () => {
		expect(
			hideVoteStatsHtml(
				'<a class="user">Example</a> (<span class="score">3.2</span>)',
			),
		).toBe('<a class="user">Example</a> ');
	});
});
