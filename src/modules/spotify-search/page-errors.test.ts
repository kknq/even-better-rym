// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from "vitest";

let frame: HTMLIFrameElement;
let target: Window;

beforeEach(async () => {
	vi.resetModules();
	frame = document.createElement("iframe");
	document.body.append(frame);
	if (!frame.contentWindow) throw new Error("Missing frame window");
	target = frame.contentWindow;
	vi.stubGlobal("window", target);
	vi.spyOn(target, "postMessage").mockImplementation(() => undefined);
	await import("./page-errors");
});
afterEach(() => {
	frame.remove();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

test("buffers startup exceptions and replays them when the isolated reader connects", () => {
	const error = new TypeError("Player startup failed");
	target.dispatchEvent(
		new ErrorEvent("error", {
			error,
			message: error.message,
			filename: "https://open.spotifycdn.com/player.js",
			lineno: 10,
			colno: 20,
		}),
	);
	vi.mocked(target.postMessage).mockClear();
	target.dispatchEvent(
		new MessageEvent("message", {
			source: target,
			origin: "https://open.spotify.com",
			data: { type: "ebr-spotify-page-errors-request" },
		}),
	);
	expect(target.postMessage).toHaveBeenCalledExactlyOnceWith(
		{
			type: "ebr-spotify-page-errors",
			errors: [
				{
					kind: "error",
					name: "TypeError",
					message: error.message,
					stack: error.stack,
					source: "https://open.spotifycdn.com/player.js",
					line: 10,
					column: 20,
				},
			],
		},
		"https://open.spotify.com",
	);
});

test("captures unhandled rejections without serializing arbitrary objects", () => {
	const rejection = new Event("unhandledrejection");
	Object.defineProperty(rejection, "reason", {
		value: { token: "must-not-be-serialized" },
	});
	target.dispatchEvent(rejection);
	expect(target.postMessage).toHaveBeenLastCalledWith(
		{
			type: "ebr-spotify-page-errors",
			errors: [
				{
					kind: "unhandledrejection",
					name: "Error",
					message: "[non-Error rejection]",
					stack: "",
					source: "",
					line: 0,
					column: 0,
				},
			],
		},
		"https://open.spotify.com",
	);
});

test("records failed script loads rather than inferring failure from timing status", () => {
	const script = document.createElement("script");
	script.src = "https://open.spotifycdn.com/player.js";
	frame.contentDocument?.body.append(script);
	script.dispatchEvent(new Event("error"));
	expect(target.postMessage).toHaveBeenLastCalledWith(
		{
			type: "ebr-spotify-page-errors",
			errors: [
				{
					kind: "resource-error",
					name: "ResourceError",
					message: "Spotify page resource failed to load",
					stack: "",
					source: script.src,
					line: 0,
					column: 0,
				},
			],
		},
		"https://open.spotify.com",
	);
});

test("bounds error count and message size", () => {
	vi.mocked(target.postMessage).mockClear();
	for (let index = 0; index < 20; index++)
		target.dispatchEvent(
			new ErrorEvent("error", { message: "x".repeat(2_000) }),
		);
	expect(target.postMessage).toHaveBeenCalledTimes(8);
	expect(target.postMessage).toHaveBeenLastCalledWith(
		{
			type: "ebr-spotify-page-errors",
			errors: Array.from({ length: 8 }, () => ({
				kind: "error",
				name: "Error",
				message: "x".repeat(1_000),
				stack: "",
				source: "",
				line: 0,
				column: 0,
			})),
		},
		"https://open.spotify.com",
	);
});
