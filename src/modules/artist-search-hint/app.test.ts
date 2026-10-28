// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import * as cache from "~/shared/utils/cache";
import { fetchInPage } from "~/shared/utils/fetch";
import { main } from "./app";

vi.mock("~/shared/utils/cache", () => ({
	get: vi.fn(),
	set: vi.fn(),
}));
vi.mock("~/shared/utils/messaging", () => ({
	sendBackgroundMessage: vi.fn(),
}));
vi.mock("~/shared/utils/fetch", () => ({
	fetchInPage: vi.fn(),
}));

beforeEach(() => {
	vi.resetAllMocks();
	// Artist header structure shared by the desktop and mobile layouts.
	document.body.innerHTML = `
		<div class="artist_page">
			<div class="section_artist_name">
				<div class="hide-for-small"><input class="rym_shortcut" value="[Artist63]"></div>
				<div class="artist_name"><h1 class="artist_name_hdr">XTC</h1><div style="clear:both"></div></div>
			</div>
			<div class="show-for-small"><input class="rym_shortcut" value="[Artist63]"></div>
		</div>
	`;
	vi.mocked(cache.get).mockResolvedValue("English New Wave band");
});

describe("artist search hint placement", () => {
	test("adds a single subtitle below the name without a label prefix", async () => {
		await main();
		const title = document.querySelector("h1");
		const hint = document.querySelector(".ebr-artist-search-hint");
		expect(title?.nextElementSibling).toBe(hint);
		expect(hint?.querySelector('[role="status"]')?.textContent).toBe(
			"English New Wave band",
		);
		expect(hint?.firstChild?.textContent).toBe("English New Wave band");
		expect(hint?.querySelector("a")).toBeNull();
		expect(hint?.querySelector("button")?.hidden).toBe(true);

		await main();
		expect(document.querySelectorAll(".ebr-artist-search-hint")).toHaveLength(
			1,
		);
		expect(cache.get).toHaveBeenCalledTimes(1);
	});

	test("supports the mobile shortcut when the desktop shortcut is absent", async () => {
		document.querySelector(".hide-for-small")?.remove();
		await main();
		expect(document.querySelector('[role="status"]')?.textContent).toBe(
			"English New Wave band",
		);
	});

	test("shows a clear empty state for an artist without a hint", async () => {
		vi.mocked(cache.get).mockResolvedValue(null);
		await main();
		expect(document.querySelector('[role="status"]')?.textContent).toBe(
			"No search hint available.",
		);
	});

	test("treats a hint as text, never live HTML", async () => {
		vi.mocked(cache.get).mockResolvedValue('<img src="x" onerror="alert(1)">');
		await main();
		expect(document.querySelector(".ebr-artist-search-hint img")).toBeNull();
		expect(document.querySelector('[role="status"]')?.textContent).toBe(
			'<img src="x" onerror="alert(1)">',
		);
	});

	test("shows loading state and prevents duplicate requests while loading", async () => {
		const pending: { resolve?: (value: string) => void } = {};
		vi.mocked(cache.get).mockReturnValueOnce(
			new Promise<string>((resolve) => {
				pending.resolve = resolve;
			}),
		);
		const loading = main();
		await vi.waitFor(() => {
			expect(document.querySelector('[role="status"]')?.textContent).toBe(
				"Loading...",
			);
		});
		await main();
		expect(cache.get).toHaveBeenCalledTimes(1);
		pending.resolve?.("English New Wave band");
		await loading;
		expect(
			document.querySelector('[role="status"]')?.getAttribute("aria-busy"),
		).toBe("false");
	});

	test("reports errors and retries without duplicating the placeholder", async () => {
		const error = new Error("Offline");
		const log = vi.spyOn(console, "error").mockReturnValue(undefined);
		vi.mocked(cache.get).mockResolvedValueOnce(undefined);
		vi.mocked(fetchInPage).mockRejectedValueOnce(error);
		await main();
		expect(log).toHaveBeenCalledWith(
			"EvenBetterRYM: could not load artist search hint",
			error,
		);
		const button = document.querySelector("button");
		expect(button?.hidden).toBe(false);
		expect(document.querySelector('[role="status"]')?.textContent).toBe(
			"Could not load search hint.",
		);

		button?.click();
		await vi.waitFor(() => {
			expect(document.querySelector('[role="status"]')?.textContent).toBe(
				"English New Wave band",
			);
		});
		expect(button?.hidden).toBe(true);
		expect(document.querySelectorAll(".ebr-artist-search-hint")).toHaveLength(
			1,
		);
		log.mockRestore();
	});

	test.each([
		".artist_name_hdr",
		".artist_page",
	])("does not fetch or inject on a page missing %s", async (selector) => {
		document.querySelector(selector)?.remove();
		await main();
		expect(document.querySelector(".ebr-artist-search-hint")).toBeNull();
		expect(cache.get).not.toHaveBeenCalled();
		expect(fetchInPage).not.toHaveBeenCalled();
	});
});
