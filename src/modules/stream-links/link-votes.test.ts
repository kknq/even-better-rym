// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";

vi.mock("~/shared/services", () => ({
	SEARCHABLES: [
		{ id: "applemusic", regex: /music\.apple\.com/ },
		{ id: "spotify", regex: /open\.spotify\.com/ },
		{ id: "tidal", regex: /tidal\.com/ },
		{ id: "youtube", regex: /youtube\.com/ },
	],
}));
vi.mock("~/shared/utils/dom", () => ({ waitForDocumentReady: vi.fn() }));
vi.mock("~/shared/utils/fetch", () => ({ fetchInPage: vi.fn() }));

import { fetchInPage } from "~/shared/utils/fetch";

import type { LinkVotes } from "./link-votes";
import {
	getServicesWithoutUpvotedLink,
	hasNoUpvotedLink,
	hasRegionalLink,
	loadLinkVotes,
	parseCountryScores,
	parseLinkVotes,
} from "./link-votes";

// Relevant structure from the saved RYM "Submit media link" page.
const row = (url: string, tally: string): string => `
	<tr style="border-bottom:1px solid var(--mono-c);">
		<td>Service</td>
		<td><a href="${url}" target="_blank">id</a><div style="padding-top:0.5em;font-size:0.9em;">${tally}</div></td>
		<td><input type="button" value="+" /></td>
	</tr>`;
const page = (rows: string): string => `
	<div id="media_link_list"><table>
		<tr><th>Service</th><th>Media ID</th><th>Vote</th></tr>
		${rows}
	</table></div>`;

const appleMusicDownvoted = "https://music.apple.com/us/album/interloper/1";
const appleMusicUpvoted = "https://music.apple.com/us/album/interloper/2";
const spotify = "https://open.spotify.com/album/5YRuPOaYcs0kEZOFosajAa";
const tidal = "https://tidal.com/album/466120623";

describe("parseCountryScores", () => {
	test("nets each country's up and down votes", () => {
		expect(parseCountryScores("CA: +1 / -0, US: +0 / -1")).toEqual({
			CA: 1,
			US: -1,
		});
	});

	test("returns no scores for an empty tally", () => {
		expect(parseCountryScores("")).toEqual({});
	});
});

describe("parseLinkVotes", () => {
	test("reads each link row and skips the header", () => {
		const html = page(
			row(appleMusicDownvoted, "CA: +1 / -0, US: +0 / -1") +
				row(spotify, "UA: +1 / -0"),
		);
		expect(parseLinkVotes(html)).toEqual([
			{ url: appleMusicDownvoted, scores: { CA: 1, US: -1 } },
			{ url: spotify, scores: { UA: 1 } },
		]);
	});

	test("returns nothing for a page without the link list", () => {
		expect(parseLinkVotes("<html>Just a moment...</html>")).toEqual([]);
	});
});

describe("hasNoUpvotedLink", () => {
	test("is false when one link scores above zero in the region", () => {
		expect(
			hasNoUpvotedLink(
				[
					{ url: appleMusicDownvoted, scores: { US: -1 } },
					{ url: appleMusicUpvoted, scores: { US: 1 } },
				],
				"US",
			),
		).toBe(false);
	});

	test("treats a region with no votes as zero", () => {
		expect(hasNoUpvotedLink([{ url: spotify, scores: { UA: 3 } }], "US")).toBe(
			true,
		);
	});

	test("treats a tied score as zero", () => {
		expect(hasNoUpvotedLink([{ url: spotify, scores: { US: 0 } }], "us")).toBe(
			true,
		);
	});
});

describe("getServicesWithoutUpvotedLink", () => {
	const links: LinkVotes[] = [
		{ url: appleMusicDownvoted, scores: { CA: 1, US: -1 } },
		{ url: appleMusicUpvoted, scores: { US: 1 } },
		{ url: spotify, scores: { UA: 1 } },
		{ url: tidal, scores: { SE: 1 } },
	];

	test("lists services with only zero or negative links in the region", () => {
		expect(
			getServicesWithoutUpvotedLink(links, {
				applemusic: "US",
				spotify: "US",
			}),
		).toEqual(["spotify"]);
	});

	test("skips services with no region set", () => {
		expect(getServicesWithoutUpvotedLink(links, {})).toEqual([]);
	});

	test("skips services with no links, such as when the fetch failed", () => {
		expect(getServicesWithoutUpvotedLink([], { youtube: "US" })).toEqual([]);
	});
});

describe("loadLinkVotes", () => {
	test("returns no links when the vote page fails to load", async () => {
		document.body.innerHTML =
			'<a href="/submit_media_link?object=release&assoc_id=1">Submit</a>';
		vi.mocked(fetchInPage).mockRejectedValue(new Error("HTTP 403"));
		expect(await loadLinkVotes()).toEqual([]);
	});
});

describe("hasRegionalLink", () => {
	test("is true when a service has a link and a region", () => {
		expect(hasRegionalLink({ spotify: spotify }, { spotify: "US" })).toBe(true);
	});

	test("is false when no linked service has a region", () => {
		expect(hasRegionalLink({ spotify: spotify }, { tidal: "US" })).toBe(false);
	});

	test("is false when the page has no links", () => {
		expect(hasRegionalLink({}, { spotify: "US" })).toBe(false);
	});
});
