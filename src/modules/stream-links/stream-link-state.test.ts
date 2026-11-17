import { describe, expect, test, vi } from "vitest";

import type { Searchable, Service } from "~/shared/services/types";
import { complete, failed } from "~/shared/utils/one-shot";

import type { LinkChecks } from "./stream-link-state";
import { getStreamLinkState } from "./stream-link-state";
import type { PageData } from "./use-page-data";

const rymLink = "https://open.spotify.com/album/rym";
const foundLink = "https://open.spotify.com/album/found";

const spotify = (search: Searchable["search"]) =>
	({ id: "spotify", search }) as unknown as Service & Searchable;

const searchOnly: LinkChecks = {
	searchUnvotedLinks: true,
	hideDownvotedLinks: false,
};
const searchAndHide: LinkChecks = {
	searchUnvotedLinks: true,
	hideDownvotedLinks: true,
};
const hideOnly: LinkChecks = {
	searchUnvotedLinks: false,
	hideDownvotedLinks: true,
};

type Votes = "upvoted" | "unvoted" | "downvoted";

const releaseData = (link: string | undefined, votes: Votes): PageData => ({
	metadata: { artist: "Quartz", title: "Interloper", serviceRegions: {} },
	links: { spotify: link } as PageData["links"],
	servicesWithoutUpvotedLink: votes === "upvoted" ? [] : ["spotify"],
	servicesWithOnlyDownvotedLinks: votes === "downvoted" ? ["spotify"] : [],
});

describe("getStreamLinkState", () => {
	test("keeps RYM's link without searching when it's upvoted", async () => {
		const search = vi.fn();
		expect(
			await getStreamLinkState(
				spotify(search),
				releaseData(rymLink, "upvoted"),
				searchOnly,
			),
		).toEqual(complete({ _tag: "exists", url: rymLink }));
		expect(search).not.toHaveBeenCalled();
	});

	test("uses the search result when RYM's links aren't upvoted", async () => {
		const search = vi.fn().mockResolvedValue(foundLink);
		expect(
			await getStreamLinkState(
				spotify(search),
				releaseData(rymLink, "unvoted"),
				searchOnly,
			),
		).toEqual(complete({ _tag: "found", url: foundLink }));
	});

	test("falls back to RYM's link when the search finds nothing", async () => {
		const search = vi.fn().mockResolvedValue(undefined);
		expect(
			await getStreamLinkState(
				spotify(search),
				releaseData(rymLink, "unvoted"),
				searchOnly,
			),
		).toEqual(complete({ _tag: "exists", url: rymLink }));
	});

	test("hides a downvoted link when hiding is chosen and the search finds nothing", async () => {
		const search = vi.fn().mockResolvedValue(undefined);
		expect(
			await getStreamLinkState(
				spotify(search),
				releaseData(rymLink, "downvoted"),
				searchAndHide,
			),
		).toEqual(complete({ _tag: "not-found" }));
	});

	test("keeps an unvoted link when hiding is chosen and the search finds nothing", async () => {
		const search = vi.fn().mockResolvedValue(undefined);
		expect(
			await getStreamLinkState(
				spotify(search),
				releaseData(rymLink, "unvoted"),
				searchAndHide,
			),
		).toEqual(complete({ _tag: "exists", url: rymLink }));
	});

	test("keeps an upvoted link even when hiding is chosen", async () => {
		const search = vi.fn();
		expect(
			await getStreamLinkState(
				spotify(search),
				releaseData(rymLink, "upvoted"),
				searchAndHide,
			),
		).toEqual(complete({ _tag: "exists", url: rymLink }));
	});

	test("hides a downvoted link without searching when only hiding is on", async () => {
		const search = vi.fn();
		expect(
			await getStreamLinkState(
				spotify(search),
				releaseData(rymLink, "downvoted"),
				hideOnly,
			),
		).toEqual(complete({ _tag: "not-found" }));
		expect(search).not.toHaveBeenCalled();
	});

	test("keeps an unvoted link without searching when only hiding is on", async () => {
		const search = vi.fn();
		expect(
			await getStreamLinkState(
				spotify(search),
				releaseData(rymLink, "unvoted"),
				hideOnly,
			),
		).toEqual(complete({ _tag: "exists", url: rymLink }));
		expect(search).not.toHaveBeenCalled();
	});

	test("keeps a downvoted link when hiding is on but the search fails", async () => {
		const search = vi.fn().mockRejectedValue(new Error("offline"));
		expect(
			await getStreamLinkState(
				spotify(search),
				releaseData(rymLink, "downvoted"),
				searchAndHide,
			),
		).toEqual(complete({ _tag: "exists", url: rymLink }));
	});

	test("falls back to RYM's link when the search fails", async () => {
		const search = vi.fn().mockRejectedValue(new Error("offline"));
		expect(
			await getStreamLinkState(
				spotify(search),
				releaseData(rymLink, "unvoted"),
				searchOnly,
			),
		).toEqual(complete({ _tag: "exists", url: rymLink }));
	});

	test("searches when RYM has no link", async () => {
		const search = vi.fn().mockResolvedValue(foundLink);
		expect(
			await getStreamLinkState(
				spotify(search),
				releaseData(undefined, "upvoted"),
				searchOnly,
			),
		).toEqual(complete({ _tag: "found", url: foundLink }));
	});

	test("reports not found when RYM has no link and the search finds none", async () => {
		const search = vi.fn().mockResolvedValue(undefined);
		expect(
			await getStreamLinkState(
				spotify(search),
				releaseData(undefined, "upvoted"),
				searchOnly,
			),
		).toEqual(complete({ _tag: "not-found" }));
	});

	test("reports the error when RYM has no link and the search fails", async () => {
		const error = new Error("offline");
		const search = vi.fn().mockRejectedValue(error);
		expect(
			await getStreamLinkState(
				spotify(search),
				releaseData(undefined, "upvoted"),
				searchOnly,
			),
		).toEqual(failed(error));
	});
});
