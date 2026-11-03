// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { searchHiddenSpotify } from "./hidden-search";
import { isFrameRequest, type SearchResult } from "./messages";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	document.body.innerHTML = "";
});

function respond(result: SearchResult) {
	const frame = document.querySelector("iframe");
	const target = frame?.contentWindow;
	if (!target) throw new Error("Missing Spotify search frame");
	const post = vi
		.spyOn(target, "postMessage")
		.mockImplementation(() => undefined);
	const message = (data: unknown) =>
		window.dispatchEvent(
			new MessageEvent("message", {
				source: target,
				origin: "https://open.spotify.com",
				data,
			}),
		);
	message({ type: "ebr-spotify-ready" });
	const request: unknown = post.mock.calls[0]?.[0];
	if (!isFrameRequest(request))
		throw new Error("Missing Spotify frame request");
	message({ type: "ebr-spotify-result", id: request.id, result });
	expect(frame?.isConnected).toBe(false);
	return request;
}

test.each([
	{
		artist: "72%",
		title: "How Is This Going to Make It Any Better",
		query: "72%2525%20How%20Is%20This%20Going%20to%20Make%20It%20Any%20Better",
	},
	{
		artist: "Artist",
		title: "100% & 50%",
		query: "Artist%20100%2525%20%26%2050%2525",
	},
	{
		artist: "Björk / Group",
		title: "A&B #1",
		query: "Bj%C3%B6rk%20%2F%20Group%20A%26B%20%231",
	},
	{
		artist: "%20",
		title: "%25",
		query: "%252520%20%252525",
	},
	{
		artist: "%2F",
		title: "%23",
		query: "%25252F%20%252523",
	},
])("uses an escaped initial URL without changing reader inputs: $artist / $title", async ({
	artist,
	title,
	query,
}) => {
	for (const [category, releaseType] of [
		["albums", undefined],
		["tracks", "music video"],
	] as const) {
		const data = {
			artist,
			title,
			...(releaseType ? { releaseType } : {}),
		};
		const pending = searchHiddenSpotify(data);
		expect(document.querySelector("iframe")?.src).toBe(
			`https://open.spotify.com/search/${query}/${category}`,
		);
		expect(() => decodeURIComponent(query)).not.toThrow();
		const request = respond({ status: "not-found" });
		expect(request.category).toBe(category);
		expect(request.data).toEqual(data);
		await expect(pending).resolves.toMatchObject({ status: "not-found" });
		expect(vi.getTimerCount()).toBe(0);
	}
});

test.each([
	"error",
	"found",
] as const)("preserves both attempts' diagnostics when the retry ends with %s", async (status) => {
	const pending = searchHiddenSpotify({ artist: "Artist", title: "Album" });
	const first = {
		stage: "page-reader-failed",
		details: '{"attempt":1,"hasSpotifyError":true}',
	};
	respond({
		status: "error",
		message: "Spotify search page failed to render",
		diagnostics: [first],
	});
	await Promise.resolve();
	const second = {
		stage: status === "error" ? "page-reader-failed" : "test-retry",
		details: '{"attempt":2}',
	};
	respond(
		status === "error"
			? {
					status,
					message: "Spotify search page failed to render",
					diagnostics: [second],
				}
			: {
					status,
					url: "https://open.spotify.com/album/3SRxE9NuyRHYLcmCTaCEL3",
					diagnostics: [second],
				},
	);
	await expect(pending).resolves.toMatchObject({
		status,
		diagnostics: [
			first,
			{ stage: "frame-finished" },
			second,
			{ stage: "frame-finished" },
		],
	});
	expect(document.querySelector("iframe")).toBeNull();
	expect(vi.getTimerCount()).toBe(0);
});
