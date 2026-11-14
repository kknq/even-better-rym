import { describe, expect, test, vi } from "vitest";

import type { Searchable, Service } from "~/shared/services/types";
import { complete, failed } from "~/shared/utils/one-shot";

import { getStreamLinkState } from "./stream-link-state";
import type { PageData } from "./use-page-data";

const rymLink = "https://open.spotify.com/album/rym";
const foundLink = "https://open.spotify.com/album/found";

const spotify = (search: Searchable["search"]) =>
	({ id: "spotify", search }) as unknown as Service & Searchable;

const releaseData = (link: string | undefined, upvoted: boolean): PageData => ({
	metadata: { artist: "Quartz", title: "Interloper", serviceRegions: {} },
	links: { spotify: link } as PageData["links"],
	servicesWithoutUpvotedLink: upvoted ? [] : ["spotify"],
});

describe("getStreamLinkState", () => {
	test("keeps RYM's link without searching when it's upvoted", async () => {
		const search = vi.fn();
		expect(
			await getStreamLinkState(spotify(search), releaseData(rymLink, true)),
		).toEqual(complete({ _tag: "exists", url: rymLink }));
		expect(search).not.toHaveBeenCalled();
	});

	test("uses the search result when RYM's links aren't upvoted", async () => {
		const search = vi.fn().mockResolvedValue(foundLink);
		expect(
			await getStreamLinkState(spotify(search), releaseData(rymLink, false)),
		).toEqual(complete({ _tag: "found", url: foundLink }));
	});

	test("falls back to RYM's link when the search finds nothing", async () => {
		const search = vi.fn().mockResolvedValue(undefined);
		expect(
			await getStreamLinkState(spotify(search), releaseData(rymLink, false)),
		).toEqual(complete({ _tag: "exists", url: rymLink }));
	});

	test("falls back to RYM's link when the search fails", async () => {
		const search = vi.fn().mockRejectedValue(new Error("offline"));
		expect(
			await getStreamLinkState(spotify(search), releaseData(rymLink, false)),
		).toEqual(complete({ _tag: "exists", url: rymLink }));
	});

	test("searches when RYM has no link", async () => {
		const search = vi.fn().mockResolvedValue(foundLink);
		expect(
			await getStreamLinkState(spotify(search), releaseData(undefined, true)),
		).toEqual(complete({ _tag: "found", url: foundLink }));
	});

	test("reports not found when RYM has no link and the search finds none", async () => {
		const search = vi.fn().mockResolvedValue(undefined);
		expect(
			await getStreamLinkState(spotify(search), releaseData(undefined, true)),
		).toEqual(complete({ _tag: "not-found" }));
	});

	test("reports the error when RYM has no link and the search fails", async () => {
		const error = new Error("offline");
		const search = vi.fn().mockRejectedValue(error);
		expect(
			await getStreamLinkState(spotify(search), releaseData(undefined, true)),
		).toEqual(failed(error));
	});
});
