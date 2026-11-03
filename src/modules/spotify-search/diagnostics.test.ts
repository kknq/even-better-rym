// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { captureSpotifyPageErrors, type SpotifyPageError } from "./diagnostics";
import { isSearchResult } from "./messages";

const error: SpotifyPageError = {
	kind: "error",
	name: "TypeError",
	message: "Cannot read properties of undefined",
	stack: "TypeError\nat https://open.spotifycdn.com/player.js:10:20",
	source: "https://open.spotifycdn.com/player.js",
	line: 10,
	column: 20,
};
let capture: ReturnType<typeof captureSpotifyPageErrors>;

function message(
	errors: unknown,
	origin = "https://open.spotify.com",
	source: Window = window,
) {
	window.dispatchEvent(
		new MessageEvent("message", {
			source,
			origin,
			data: { type: "ebr-spotify-page-errors", errors },
		}),
	);
}

beforeEach(() => {
	vi.spyOn(window, "postMessage").mockImplementation(() => undefined);
	capture = captureSpotifyPageErrors();
});
afterEach(() => {
	capture.dispose();
	vi.restoreAllMocks();
});

test("requests buffered startup errors and retains exception source locations", () => {
	expect(window.postMessage).toHaveBeenCalledWith(
		{ type: "ebr-spotify-page-errors-request" },
		"https://open.spotify.com",
	);
	message([error]);
	expect(capture.hasErrors()).toBe(true);
	expect(JSON.parse(capture.diagnostic([]).details)).toEqual({
		available: true,
		errors: [error],
	});
});

test("distinguishes an unavailable recorder from an available recorder without errors", () => {
	expect(JSON.parse(capture.diagnostic([]).details)).toEqual({
		available: false,
		errors: [],
	});
	message([]);
	expect(JSON.parse(capture.diagnostic([]).details)).toEqual({
		available: true,
		errors: [],
	});
});

test("redacts search terms, credentials, and URL parameters before exposing diagnostics", () => {
	message([
		{
			...error,
			message:
				'Artist Album Bearer private-auth password="private-password" token=private-token',
			stack:
				"at https://open.spotify.com/search/Artist%20Album?token=private-query#private-fragment",
			source:
				"https://open.spotifycdn.com/player.js?token=private-source#fragment",
		},
	]);
	const details = capture.diagnostic(["Artist", "Album"]).details;
	for (const secret of [
		"Artist",
		"Album",
		"private-auth",
		"private-password",
		"private-token",
		"private-query",
		"private-fragment",
		"private-source",
	])
		expect(details).not.toContain(secret);
	expect(details).toContain("https://open.spotify.com/search/[query]");
	expect(details).toContain("https://open.spotifycdn.com/player.js");
});

test("ignores spoofed origins, other windows, and malformed or oversized payloads", () => {
	message([error], "https://example.com");
	const iframe = document.createElement("iframe");
	document.body.append(iframe);
	if (!iframe.contentWindow) throw new Error("Missing frame window");
	message([error], "https://open.spotify.com", iframe.contentWindow);
	iframe.remove();
	message([{ ...error, stack: "x".repeat(2_001) }]);
	message(Array.from({ length: 9 }, () => error));
	message([{ ...error, line: Number.NaN }]);
	expect(capture.hasErrors()).toBe(false);
	expect(JSON.parse(capture.diagnostic([]).details)).toEqual({
		available: false,
		errors: [],
	});
});

test("keeps serialized diagnostics valid and within the message size limit", () => {
	message(
		Array.from({ length: 8 }, () => ({
			...error,
			message: "\u0000".repeat(1_000),
			stack: "\u0000".repeat(2_000),
			source: "\u0000".repeat(1_000),
		})),
	);
	const diagnostic = capture.diagnostic([]);
	expect(diagnostic.details.length).toBeLessThanOrEqual(16_000);
	expect(() => JSON.parse(diagnostic.details) as unknown).not.toThrow();
	expect(
		isSearchResult({
			status: "error",
			message: "Spotify search page failed to render",
			diagnostics: [diagnostic],
		}),
	).toBe(true);
});

test("stops collecting when the frame reader is finished", () => {
	capture.dispose();
	message([error]);
	expect(capture.hasErrors()).toBe(false);
});
