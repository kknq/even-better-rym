// @vitest-environment jsdom

import { beforeEach, expect, test, vi } from "vitest";
import { fetch } from "~/shared/utils/fetch";
import { search as bandcamp } from "./bandcamp/search";
import { search as qobuz } from "./qobuz/search";
import { search as soundcloud } from "./soundcloud/search";
import { search as youtube } from "./youtube/search";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));
vi.mock("./soundcloud/auth", () => ({
	requestToken: vi.fn().mockResolvedValue("test-client"),
}));

beforeEach(() => vi.mocked(fetch).mockReset());

test.each([
	{
		service: "Bandcamp",
		search: bandcamp,
		empty: "<div></div>",
		found:
			'<div class="result-info"><div class="itemurl"><a>https://artist.bandcamp.com/album/volume-1</a></div></div>',
		expected: "https://artist.bandcamp.com/album/volume-1",
	},
	{
		service: "SoundCloud",
		search: soundcloud,
		empty: '{"collection":[]}',
		found:
			'{"collection":[{"kind":"playlist","permalink_url":"https://soundcloud.com/artist/sets/volume-1"}]}',
		expected: "https://soundcloud.com/artist/sets/volume-1",
	},
	{
		service: "YouTube",
		search: youtube,
		empty:
			'<script>var ytInitialData = {"contents":{"twoColumnSearchResultsRenderer":{"primaryContents":{"sectionListRenderer":{"contents":[{"itemSectionRenderer":{"contents":[]}}]}}}}};</script>',
		found:
			'<script>var ytInitialData = {"contents":{"twoColumnSearchResultsRenderer":{"primaryContents":{"sectionListRenderer":{"contents":[{"itemSectionRenderer":{"contents":[{"videoRenderer":{"videoId":"volume1"}}]}}]}}}}};</script>',
		expected: "https://www.youtube.com/watch?v=volume1",
	},
])("$service retries equivalent numbered volume queries", async ({
	search,
	empty,
	found,
	expected,
}) => {
	vi.mocked(fetch).mockResolvedValueOnce(empty).mockResolvedValueOnce(found);
	await expect(
		search({ artist: "Artist", title: "Album Volume 1" }),
	).resolves.toBe(expected);
	const request = vi.mocked(fetch).mock.calls[1][0];
	expect(request.urlParameters?.q ?? request.urlParameters?.search_query).toBe(
		"Artist Album Vol. 1",
	);
});

test("Qobuz retries the abbreviated volume after its existing punctuation fallback", async () => {
	vi.mocked(fetch)
		.mockResolvedValueOnce('<div id="release-card-list"></div>')
		.mockResolvedValueOnce(
			'<div id="release-card-list"><a href="/us-en/album/volume-1/id">Album Vol. 1</a></div>',
		);
	await expect(
		qobuz({ artist: "Artist", title: "Album Volume 1" }),
	).resolves.toBe("https://open.qobuz.com/album/id");
	expect(vi.mocked(fetch).mock.calls[1][0].url).toContain(
		encodeURIComponent("Artist Album Vol. 1"),
	);
});
