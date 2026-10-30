// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { readHiddenTidalCredits } from "./hidden-credits";
import { isFrameRequest } from "./messages";

const data = { albumId: "123", trackIds: ["101"] };
const result = {
	tracks: [{ id: "101", credits: [{ name: "Writer", role: "Composer" }] }],
};
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	document.body.innerHTML = "";
});

function frame() {
	const element = document.querySelector("iframe");
	if (!element?.contentWindow)
		throw new Error("Missing invisible credits frame");
	return element;
}
function message(
	element: HTMLIFrameElement,
	payload: unknown,
	origin = "https://tidal.com",
) {
	window.dispatchEvent(
		new MessageEvent("message", {
			source: element.contentWindow,
			origin,
			data: payload,
		}),
	);
}
function handshake(element: HTMLIFrameElement) {
	const target = element.contentWindow;
	if (!target) throw new Error("Missing frame window");
	const post = vi
		.spyOn(target, "postMessage")
		.mockImplementation(() => undefined);
	message(element, { type: "ebr-tidal-ready" });
	const sent: unknown = post.mock.calls[0]?.[0];
	if (!isFrameRequest(sent)) throw new Error("Missing validated frame request");
	return sent;
}

test("loads a sandboxed invisible frame and removes it and its timer after a matched response", async () => {
	const pending = readHiddenTidalCredits(data);
	const element = frame();
	expect(element.src).toBe("https://tidal.com/album/123/credits");
	expect(element.getAttribute("sandbox")).toBe(
		"allow-scripts allow-same-origin",
	);
	const request = handshake(element);
	expect(request.data).toEqual(data);
	message(element, { type: "ebr-tidal-result", id: request.id, result });
	await expect(pending).resolves.toEqual(result);
	expect(document.querySelector("iframe")).toBeNull();
	expect(vi.getTimerCount()).toBe(0);
});

test("ignores unrelated origins, windows and request IDs", async () => {
	const pending = readHiddenTidalCredits(data);
	const element = frame();
	const request = handshake(element);
	message(
		element,
		{ type: "ebr-tidal-result", id: request.id, result },
		"https://example.com",
	);
	message(element, { type: "ebr-tidal-result", id: "other", result });
	window.dispatchEvent(
		new MessageEvent("message", {
			source: window,
			origin: "https://tidal.com",
			data: { type: "ebr-tidal-result", id: request.id, result },
		}),
	);
	expect(element.isConnected).toBe(true);
	message(element, { type: "ebr-tidal-result", id: request.id, result });
	await expect(pending).resolves.toEqual(result);
});

test("rejects malformed matching responses and removes its frame", async () => {
	const pending = readHiddenTidalCredits(data);
	const element = frame();
	const request = handshake(element);
	message(element, {
		type: "ebr-tidal-result",
		id: request.id,
		result: { tracks: null },
	});
	await expect(pending).resolves.toEqual({
		error: "Invalid Tidal credits frame response",
	});
	expect(document.querySelector("iframe")).toBeNull();
});

test("cleans up a stalled frame without any visible fallback", async () => {
	const pending = readHiddenTidalCredits(data);
	await vi.advanceTimersByTimeAsync(35_000);
	await expect(pending).resolves.toEqual({
		error: "Invisible Tidal credits page did not respond",
	});
	expect(document.querySelector("iframe")).toBeNull();
	expect(vi.getTimerCount()).toBe(0);
});

test("reports frame load errors explicitly", async () => {
	const pending = readHiddenTidalCredits(data);
	frame().dispatchEvent(new Event("error"));
	await expect(pending).resolves.toEqual({
		error: "Invisible Tidal credits page did not load",
	});
	expect(document.querySelector("iframe")).toBeNull();
});
