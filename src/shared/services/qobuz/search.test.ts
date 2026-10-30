// @vitest-environment jsdom

import { beforeEach, expect, test, vi } from "vitest";
import { fetch } from "~/shared/utils/fetch";
import { search } from "./search";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));

const noResults = '<div id="release-card-list"></div>';
const album = `<div id="release-card-list">
	<a href="/us-en/album/between-the-sword-and-the-neck-no-man/fgt2rrfuqeanj">
		Between the Sword and the Neck
	</a>
</div>`;
const currentAlbum = `<main id="search">
	<div id="release-card-list-209256535">
		<div id="release-card-release-card-list-209256535-grid-1-fgt2rrfuqeanj">
			<a href="https://www.qobuz.com/us-en/album/between-the-sword-and-the-neck-no-man/fgt2rrfuqeanj"
				title="More details on Between the Sword and the Neck by NØ MAN.">
				<img alt="" />
			</a>
			<a href="https://www.qobuz.com/us-en/album/between-the-sword-and-the-neck-no-man/fgt2rrfuqeanj">
				Between the Sword and the Neck
			</a>
			<span>NØ MAN</span>
		</div>
	</div>
</main>`;
const metadata = {
	artist: "Nø Man",
	title: "Between the Sword and the Neck",
};

beforeEach(() => vi.mocked(fetch).mockReset());

test("retries the saved RYM artist spelling as No Man when Qobuz has no original match", async () => {
	vi.mocked(fetch)
		.mockResolvedValueOnce(noResults)
		.mockResolvedValueOnce(currentAlbum);

	await expect(search(metadata)).resolves.toBe(
		"https://open.qobuz.com/album/fgt2rrfuqeanj",
	);
	expect(fetch).toHaveBeenNthCalledWith(1, {
		url: `https://www.qobuz.com/us-en/search/albums/${encodeURIComponent("Nø Man Between the Sword and the Neck")}`,
		method: "GET",
	});
	expect(fetch).toHaveBeenNthCalledWith(2, {
		url: `https://www.qobuz.com/us-en/search/albums/${encodeURIComponent("No Man Between the Sword and the Neck")}`,
		method: "GET",
	});
});

test("keeps the original spelling when it already finds an album", async () => {
	vi.mocked(fetch).mockResolvedValueOnce(album);

	await expect(search(metadata)).resolves.toBe(
		"https://open.qobuz.com/album/fgt2rrfuqeanj",
	);
	expect(fetch).toHaveBeenCalledOnce();
});

test("reads the current Qobuz result list with a generated ID and an absolute album URL", async () => {
	vi.mocked(fetch).mockResolvedValueOnce(currentAlbum);

	await expect(search(metadata)).resolves.toBe(
		"https://open.qobuz.com/album/fgt2rrfuqeanj",
	);
	expect(fetch).toHaveBeenCalledOnce();
});

test("ignores album links outside the search result list", async () => {
	vi.mocked(fetch).mockResolvedValue(
		`<header><a href="/us-en/album/unrelated/other">Other album</a></header>
		<main id="search"><div id="release-card-list-209256535"></div></main>`,
	);

	await expect(search(metadata)).resolves.toBeUndefined();
});

test("retries the saved DIIV release without title punctuation", async () => {
	vi.mocked(fetch)
		.mockResolvedValueOnce(noResults)
		.mockResolvedValueOnce(`<div id="release-card-list">
			<a href="/us-en/album/zirp-diiv/qxgr25uxnc3og">ZIRP!</a>
		</div>`);

	await expect(search({ artist: "DIIV", title: "ZIRP!" })).resolves.toBe(
		"https://open.qobuz.com/album/qxgr25uxnc3og",
	);
	expect(fetch).toHaveBeenNthCalledWith(1, {
		url: "https://www.qobuz.com/us-en/search/albums/DIIV%20ZIRP!",
		method: "GET",
	});
	expect(fetch).toHaveBeenNthCalledWith(2, {
		url: "https://www.qobuz.com/us-en/search/albums/DIIV%20ZIRP",
		method: "GET",
	});
});

test("normalizes combining accents and slashed O in the fallback query", async () => {
	vi.mocked(fetch)
		.mockResolvedValueOnce(noResults)
		.mockResolvedValueOnce(album);

	await search({ artist: "NØ Man", title: "Cafe\u0301 / Déjà Vu" });

	expect(fetch).toHaveBeenNthCalledWith(2, {
		url: `https://www.qobuz.com/us-en/search/albums/${encodeURIComponent("No Man Cafe Deja Vu")}`,
		method: "GET",
	});
});

test("does not repeat searches whose query needs no normalization", async () => {
	vi.mocked(fetch).mockResolvedValueOnce(noResults);

	await expect(
		search({ artist: "No Man", title: metadata.title }),
	).resolves.toBeUndefined();
	expect(fetch).toHaveBeenCalledOnce();
});

test("does not search an empty normalized query for punctuation-only names", async () => {
	vi.mocked(fetch).mockResolvedValueOnce(noResults);

	await expect(
		search({ artist: "!!!", title: "!!!" }),
	).resolves.toBeUndefined();
	expect(fetch).toHaveBeenCalledOnce();
});

test("returns no match when neither spelling finds an album", async () => {
	vi.mocked(fetch).mockResolvedValue(noResults);

	await expect(search(metadata)).resolves.toBeUndefined();
	expect(fetch).toHaveBeenCalledTimes(2);
});

test.each([
	1, 2,
])("propagates a failed request on attempt %i", async (attempt) => {
	if (attempt === 2) vi.mocked(fetch).mockResolvedValueOnce(noResults);
	vi.mocked(fetch).mockRejectedValueOnce(new Error("HTTP 403"));

	await expect(search(metadata)).rejects.toThrow("HTTP 403");
	expect(fetch).toHaveBeenCalledTimes(attempt);
});
