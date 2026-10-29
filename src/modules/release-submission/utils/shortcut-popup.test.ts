// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";
import { openArtistLinkPopup } from "./page-functions";

vi.mock("./page-functions", () => ({
	openArtistLinkPopup: vi.fn().mockResolvedValue(undefined),
	closeShortcutPopup: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("webextension-polyfill", () => ({ default: {} }));

import {
	parseArtistResultId,
	prefillArtistSearch,
	startArtistSearch,
	watchArtistResultClicks,
} from "./shortcut-popup";

afterEach(() => {
	document.body.replaceChildren();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

test("does not intercept manual Insert link clicks after closing or changing the popup target", () => {
	document.body.innerHTML = '<iframe id="shortcutsearchframe"></iframe>';
	const frame = document.querySelector<HTMLIFrameElement>("iframe");
	const doc = frame?.contentDocument;
	if (!doc) throw new Error("Missing frame document");
	doc.body.innerHTML = "<a onclick=\"createShortcut('a', '123')\">Artist</a>";
	Object.defineProperty(doc.defaultView, "createShortcut", { value: vi.fn() });
	const picked = vi.fn();
	const cancelled = vi.fn();
	const stop = watchArtistResultClicks(picked, "picker", cancelled);
	try {
		doc.querySelector("a")?.click();
		expect(picked).toHaveBeenCalledExactlyOnceWith("123");
		document.dispatchEvent(
			new CustomEvent("EbrShortcutPopupEvent", {
				detail: { targetId: "track_title" },
			}),
		);
		doc.querySelector("a")?.click();
		expect(picked).toHaveBeenCalledOnce();
		expect(cancelled).toHaveBeenCalledOnce();
	} finally {
		stop();
	}
});

test("awaits opening the popup before navigating its frame", async () => {
	document.body.innerHTML = '<iframe id="shortcutsearchframe"></iframe>';
	let open: (() => void) | undefined;
	vi.mocked(openArtistLinkPopup).mockImplementationOnce(
		() =>
			new Promise<void>((resolve) => {
				open = resolve;
			}),
	);
	const search = startArtistSearch("picker", "Name");
	const frame = document.querySelector<HTMLIFrameElement>("iframe");
	expect(frame?.getAttribute("src")).toBeNull();
	document.dispatchEvent(
		new CustomEvent("EbrShortcutPopupEvent", { detail: {} }),
	);
	open?.();
	await search;
	expect(frame?.getAttribute("src")).toBeNull();
});

test("times out a search whose frame never loads", async () => {
	vi.useFakeTimers();
	document.body.innerHTML = '<iframe id="shortcutsearchframe"></iframe>';
	const search = prefillArtistSearch("Name");
	const assertion = expect(search).rejects.toThrow("Artist search timed out");
	await vi.advanceTimersByTimeAsync(10_000);
	await assertion;
});

describe("parseArtistResultId", () => {
	test("reads the artist id from a result row's onclick", () => {
		expect(
			parseArtistResultId(
				"window.parent.createShortcut('a', '1639184');return false;",
			),
		).toBe("1639184");
	});

	test("ignores non-artist shortcuts", () => {
		expect(
			parseArtistResultId("window.parent.createShortcut('b', '42');"),
		).toBeUndefined();
	});

	test("ignores text with no shortcut call", () => {
		expect(parseArtistResultId("")).toBeUndefined();
		expect(parseArtistResultId("navArtist(5)")).toBeUndefined();
	});
});
