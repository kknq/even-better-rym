// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	loadSection,
	parseSectionResponse,
	readReleases,
	readTotal,
} from "./artist-discography";
import type { ReleaseType } from "./release-types";
import { runScript } from "./utils/dom";
import * as storage from "./utils/storage";

vi.mock("./utils/dom", () => ({ runScript: vi.fn() }));
vi.mock("./utils/storage", () => ({
	get: vi.fn(),
	set: vi.fn(),
	getAll: vi.fn(),
	remove: vi.fn(),
}));

function row(id: number, status: string) {
	return `<div class="disco_release" id="release_${id}">
		<span class="disco_cat"><span class="disco_cat_inner">${status}</span></span>
		<div class="disco_avg_rating">4.5</div></div>`;
}

beforeEach(() => {
	vi.resetAllMocks();
	document.body.innerHTML = "";
	// Requests are cached only for the current artist and release type.
	history.replaceState({}, "", `/artist/test-${crypto.randomUUID()}`);
});

describe("discography data", () => {
	test("counts personal ratings and listened status, not ownership or averages", () => {
		document.body.innerHTML = [
			row(1, "4.0/Wishlist"),
			row(2, "3.5/Vinyl"),
			row(3, "Listened/CD"),
			row(4, "Vinyl"),
			row(5, "Wishlist"),
			row(6, "Rate"),
			row(7, "Not listened"),
			row(8, "0.0"),
			row(9, "Not rated"),
			row(10, "4.5"),
			row(10, "Rate"),
		].join("");
		expect([...readReleases(document).values()]).toEqual([
			true,
			true,
			true,
			false,
			false,
			false,
			false,
			false,
			false,
			true,
		]);
	});

	test("preserves escaped surrogate pairs, hex characters and backslashes", () => {
		const body = String.raw`RYMartistPage._expandDiscographySectionCallback("s", "<span id=\"escaped-text\">\uD83C\uDFB5 \x41 \\music</span>")`;
		const section = parseSectionResponse(body, "s");
		expect(section.querySelector("#escaped-text")?.textContent).toBe(
			"\u{1F3B5} A \\music",
		);
	});

	test.each([
		["Showing all (10)", 10],
		["Showing 43 of 52", 52],
		["Showing 100 of 1,234", 1234],
		["Loading...", null],
	])("reads the complete total from %s", (text, total) => {
		document.body.innerHTML = `<span id="disco_header_showing_s">${text}</span>`;
		expect(readTotal(document, "s")).toBe(total);
	});

	test("decodes callback HTML without executing any response script", () => {
		const html = `${row(1, "4.0")}<script>throw new Error("never execute")</script>`;
		const body = `RYMartistPage._expandDiscographySectionCallback('s', ${JSON.stringify(html)});`;
		expect(readReleases(parseSectionResponse(body, "s"))).toEqual(
			new Map([["release_1", true]]),
		);
	});

	test("supports single quotes and JavaScript unicode and hex escapes", () => {
		const html = row(1, "Listened");
		const escaped = html
			.replace(/"/g, "\\x22")
			.replace(/\n/g, "\\n")
			.replace(/</g, "\\u003c");
		expect(
			readReleases(
				parseSectionResponse(
					`RYMartistPage._expandDiscographySectionCallback("e", '${escaped}')`,
					"e",
				),
			),
		).toEqual(new Map([["release_1", true]]));
	});

	test.each([
		"<html>Rate limited</html>",
		'RYMartistPage._expandDiscographySectionCallback("e", "")',
		'RYMartistPage._expandDiscographySectionCallback("s", runCode())',
		'RYMartistPage._expandDiscographySectionCallback("s", "\\uZZZZ")',
		'RYMartistPage._expandDiscographySectionCallback("s", "\\xZZ")',
		'RYMartistPage._expandDiscographySectionCallback("s", "\\q")',
		'RYMartistPage._expandDiscographySectionCallback("s", "unterminated)',
	])("rejects malformed or unexpected responses", (body) => {
		expect(() => parseSectionResponse(body, "s")).toThrow();
	});
});

function dispatchResult(
	script: string,
	result: { body?: string; status?: number; retryAfter?: string | null },
) {
	const id = /id: "([^"]+)"/.exec(script)?.[1];
	if (!id) throw new Error("Missing request ID");
	window.dispatchEvent(
		new MessageEvent("message", {
			source: window,
			origin: location.origin,
			data: { type: "EBR_DISCOGRAPHY_RESULT", id, ...result },
		}),
	);
}

function reply(body: string) {
	vi.mocked(runScript).mockImplementation((script) => {
		dispatchResult(script, { body });
		return Promise.resolve();
	});
}

describe("background section loading", () => {
	const load = loadSection;
	let clock = Date.now();
	let saved: Map<string, unknown>;

	function cacheKey(type: ReleaseType = "s", username: string | null = null) {
		return JSON.stringify([
			"artist-discography.v1",
			location.origin,
			username,
			location.pathname,
			type,
			readTotal(document, type),
		]);
	}

	beforeEach(() => {
		vi.useFakeTimers();
		clock += 60 * 60_000;
		vi.setSystemTime(clock);
		saved = new Map();
		vi.mocked(storage.get).mockImplementation((key) =>
			Promise.resolve(saved.get(key)),
		);
		vi.mocked(storage.set).mockImplementation((key, value) => {
			saved.set(key, value);
			return Promise.resolve();
		});
		vi.mocked(storage.remove).mockImplementation((key) => {
			saved.delete(key);
			return Promise.resolve();
		});
		vi.mocked(storage.getAll).mockImplementation(() =>
			Promise.resolve(Object.fromEntries(saved)),
		);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	test("shares in-flight and completed requests without unfolding the list", async () => {
		document.body.innerHTML = `<div id="disco_type_s">${row(1, "Rate")}</div>
			<span id="disco_header_showing_s">Showing 1 of 2</span>`;
		const before = document.body.innerHTML;
		reply(
			`RYMartistPage._expandDiscographySectionCallback("s", ${JSON.stringify(row(1, "Rate") + row(2, "4.5"))})`,
		);
		const first = load("s");
		expect(load("s")).toBe(first);
		await vi.runAllTimersAsync();
		expect(readReleases(await first).size).toBe(2);
		await load("s");
		expect(runScript).toHaveBeenCalledTimes(1);
		expect(document.body.innerHTML).toBe(before);
		expect(saved.get(cacheKey())).toHaveProperty(
			"expire",
			Date.now() + 3_600_000,
		);
		expect(saved.get(cacheKey())).toHaveProperty(
			"data",
			expect.stringContaining('id="release_2"'),
		);
	});

	test("loads persisted responses without requests or waiting, even during cooldown", async () => {
		const key = cacheKey();
		saved.set(key, {
			expire: Date.now() + 60_000,
			data: row(1, "4.5"),
		});
		saved.set("discography-progress.cooldown-until", Date.now() + 5 * 60_000);
		const result = await load("s");
		expect(readReleases(result)).toEqual(new Map([["release_1", true]]));
		expect(runScript).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
		expect(storage.get).not.toHaveBeenCalledWith(
			"discography-progress.cooldown-until",
		);
	});

	test("refetches expired responses after one hour", async () => {
		const key = cacheKey();
		const start = Date.now();
		saved.set(key, {
			expire: start - 1,
			data: row(1, "Rate"),
		});
		reply(
			`RYMartistPage._expandDiscographySectionCallback("s", ${JSON.stringify(row(1, "Listened"))})`,
		);
		const pending = load("s");
		await vi.runAllTimersAsync();
		expect(readReleases(await pending).get("release_1")).toBe(true);
		expect(storage.remove).toHaveBeenCalledWith(key);
		expect(runScript).toHaveBeenCalledOnce();
	});

	test("reuses responses before the one-hour expiry and refetches afterward", async () => {
		reply(
			`RYMartistPage._expandDiscographySectionCallback("s", ${JSON.stringify(row(1, "Rate"))})`,
		);
		const first = load("s");
		await vi.runAllTimersAsync();
		await first;
		await vi.advanceTimersByTimeAsync(3_599_999);
		await load("s");
		expect(runScript).toHaveBeenCalledOnce();
		await vi.advanceTimersByTimeAsync(2);
		reply(
			`RYMartistPage._expandDiscographySectionCallback("s", ${JSON.stringify(row(1, "Listened"))})`,
		);
		const refreshed = load("s");
		await vi.runAllTimersAsync();
		expect(readReleases(await refreshed).get("release_1")).toBe(true);
		expect(runScript).toHaveBeenCalledTimes(2);
	});

	test("isolates cached and in-memory responses between accounts", async () => {
		document.body.innerHTML =
			'<div class="header_profile_logged_in"><a class="header_profile_main" href="/~Listener"></a></div>';
		saved.set(cacheKey("s", "listener"), {
			expire: Date.now() + 60_000,
			data: row(1, "4.5"),
		});
		expect(readReleases(await load("s")).get("release_1")).toBe(true);
		document.querySelector("a")?.setAttribute("href", "/~Another");
		reply(
			`RYMartistPage._expandDiscographySectionCallback("s", ${JSON.stringify(row(1, "Rate"))})`,
		);
		const pending = load("s");
		await vi.runAllTimersAsync();
		expect(readReleases(await pending).get("release_1")).toBe(false);
		expect(runScript).toHaveBeenCalledOnce();
		expect(saved.has(cacheKey("s", "another"))).toBe(true);
		document.querySelector("a")?.setAttribute("href", "/~Listener");
		expect(readReleases(await load("s")).get("release_1")).toBe(true);
	});

	test("invalidates cached responses when the page total changes", async () => {
		document.body.innerHTML =
			'<span id="disco_header_showing_s">Showing 1 of 2</span>';
		saved.set(cacheKey(), {
			expire: Date.now() + 60_000,
			data: row(1, "Rate") + row(2, "Listened"),
		});
		expect(readReleases(await load("s")).size).toBe(2);
		document.querySelector("span")?.replaceChildren("Showing 1 of 3");
		reply(
			`RYMartistPage._expandDiscographySectionCallback("s", ${JSON.stringify(row(1, "Rate") + row(2, "Listened") + row(3, "Rate"))})`,
		);
		const pending = load("s");
		await vi.runAllTimersAsync();
		expect(readReleases(await pending).size).toBe(3);
		expect(runScript).toHaveBeenCalledOnce();
	});

	test.each([
		["invalid HTML", "not a section"],
		["invalid data", 42],
		["incomplete data", row(1, "Rate")],
	])("refetches and reports %s in the cache", async (_label, data) => {
		const log = vi.spyOn(console, "error").mockReturnValue(undefined);
		document.body.innerHTML =
			'<span id="disco_header_showing_s">Showing 1 of 2</span>';
		const key = cacheKey();
		saved.set(key, { expire: Date.now() + 60_000, data });
		reply(
			`RYMartistPage._expandDiscographySectionCallback("s", ${JSON.stringify(row(1, "Rate") + row(2, "Listened"))})`,
		);
		const pending = load("s");
		await vi.runAllTimersAsync();
		expect(readReleases(await pending).size).toBe(2);
		expect(runScript).toHaveBeenCalledOnce();
		expect(log).toHaveBeenCalledWith(
			"EvenBetterRYM: could not read discography cache",
			expect.any(Error),
		);
	});

	test("returns fetched data and reports cache write failures", async () => {
		const log = vi.spyOn(console, "error").mockReturnValue(undefined);
		vi.mocked(storage.set).mockRejectedValue(new Error("Storage full"));
		reply(
			`RYMartistPage._expandDiscographySectionCallback("s", ${JSON.stringify(row(1, "Listened"))})`,
		);
		const pending = load("s");
		await vi.runAllTimersAsync();
		expect(readReleases(await pending).get("release_1")).toBe(true);
		expect(log).toHaveBeenCalledWith(
			"EvenBetterRYM: could not cache discography response",
			expect.any(Error),
		);
	});

	test("rejects incomplete results and permits a retry", async () => {
		document.body.innerHTML =
			'<span id="disco_header_showing_s">Showing 1 of 2</span>';
		reply(
			`RYMartistPage._expandDiscographySectionCallback("s", ${JSON.stringify(row(1, "Rate"))})`,
		);
		const failed = expect(load("s")).rejects.toThrow("Incomplete");
		await vi.runAllTimersAsync();
		await failed;
		expect(storage.set).not.toHaveBeenCalled();
		reply(
			`RYMartistPage._expandDiscographySectionCallback("s", ${JSON.stringify(row(1, "Rate") + row(2, "Listened"))})`,
		);
		const retried = load("s");
		await vi.runAllTimersAsync();
		expect(readReleases(await retried).size).toBe(2);
		expect(runScript).toHaveBeenCalledTimes(2);
	});

	test("propagates script injection failures", async () => {
		vi.mocked(runScript).mockRejectedValue(new Error("Cannot inject"));
		const failed = expect(load("s")).rejects.toThrow("Cannot inject");
		await vi.runAllTimersAsync();
		await failed;
	});

	test.each([
		["Injection blocked", "Injection blocked"],
		[{ reason: "Injection blocked" }, "Could not inject discography request"],
	])("preserves non-Error injection failures as the cause: %j", async (cause, message) => {
		vi.mocked(runScript).mockRejectedValue(cause);
		const failed = expect(load("s")).rejects.toMatchObject({ message, cause });
		await vi.runAllTimersAsync();
		await failed;
	});

	test.each([
		[0, 750],
		[0.5, 800],
		[0.999999, 850],
	])("serializes requests with random sample %s producing a %i ms pause after completion", async (random, delay) => {
		const randomSpy = vi.spyOn(Math, "random").mockReturnValue(random);
		let script = "";
		vi.mocked(runScript).mockImplementation((source) => {
			script = source;
			return Promise.resolve();
		});
		const respond = () => {
			const type = /type: "([a-z])"/.exec(script)?.[1];
			if (!type) throw new Error("Missing section type");
			dispatchResult(script, {
				body: `RYMartistPage._expandDiscographySectionCallback("${type}", ${JSON.stringify(row(1, "Rate"))})`,
			});
		};
		const first = load("s");
		const second = load("e");
		expect(load("e")).toBe(second);
		await vi.advanceTimersByTimeAsync(0);
		expect(runScript).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1000);
		expect(runScript).toHaveBeenCalledTimes(1);
		respond();
		await vi.advanceTimersByTimeAsync(0);
		await first;
		expect(runScript).toHaveBeenCalledTimes(1);
		expect(randomSpy).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(delay - 1);
		expect(runScript).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(runScript).toHaveBeenCalledTimes(2);
		respond();
		await second;
		expect(randomSpy).toHaveBeenCalledTimes(2);
	});

	test("stops queued requests on 429 and persists the cooldown across reloads", async () => {
		let persisted = 0;
		vi.mocked(storage.get).mockImplementation((key) =>
			Promise.resolve(
				key === "discography-progress.cooldown-until" ? persisted : undefined,
			),
		);
		vi.mocked(storage.set).mockImplementation((key, value) => {
			if (key !== "discography-progress.cooldown-until")
				return Promise.resolve();
			if (typeof value !== "number") throw new Error("Invalid cooldown");
			persisted = value;
			return Promise.resolve();
		});
		vi.mocked(runScript).mockImplementation((script) => {
			dispatchResult(script, { status: 429, retryAfter: null });
			return Promise.resolve();
		});
		const results = Promise.allSettled([load("s"), load("e"), load("i")]);
		await vi.runAllTimersAsync();
		const settled = await results;
		expect(settled.every((result) => result.status === "rejected")).toBe(true);
		expect(runScript).toHaveBeenCalledTimes(1);
		expect(persisted).toBe(Date.now() + 5 * 60_000);
		expect(storage.set).toHaveBeenCalledWith(
			"discography-progress.cooldown-until",
			persisted,
		);

		history.replaceState({}, "", "/artist/another-artist");
		await expect(load("j")).rejects.toMatchObject({
			name: "DiscographyRateLimitError",
			retryAt: persisted,
		});

		expect(runScript).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(5 * 60_000);
		expect(runScript).toHaveBeenCalledTimes(1);
		reply(
			`RYMartistPage._expandDiscographySectionCallback("s", ${JSON.stringify(row(1, "4.5"))})`,
		);
		const retried = load("s");
		await vi.runAllTimersAsync();
		expect(readReleases(await retried).size).toBe(1);
		expect(runScript).toHaveBeenCalledTimes(2);
	});

	test("checks a persisted cooldown before starting any request on a new page", async () => {
		const until = Date.now() + 120_000;
		vi.mocked(storage.get).mockResolvedValue(until);
		await expect(load("s")).rejects.toMatchObject({
			name: "DiscographyRateLimitError",
			retryAt: until,
		});
		expect(storage.get).toHaveBeenCalledWith(
			"discography-progress.cooldown-until",
		);
		expect(runScript).not.toHaveBeenCalled();
	});

	test.each([
		["120", 120_000],
		["0", 60_000],
		["invalid", 5 * 60_000],
	])("honors Retry-After %s with a conservative minimum cooldown", async (header, wait) => {
		vi.mocked(runScript).mockImplementation((script) => {
			dispatchResult(script, { status: 429, retryAfter: header });
			return Promise.resolve();
		});
		const start = Date.now();
		const failed = expect(load("s")).rejects.toMatchObject({
			name: "DiscographyRateLimitError",
			retryAt: start + wait,
		});
		await vi.runAllTimersAsync();
		await failed;
	});

	test("honors HTTP-date Retry-After headers", async () => {
		const until = Math.ceil((Date.now() + 10 * 60_000) / 1000) * 1000;
		vi.mocked(runScript).mockImplementation((script) => {
			dispatchResult(script, {
				status: 429,
				retryAfter: new Date(until).toUTCString(),
			});
			return Promise.resolve();
		});
		const failed = expect(load("s")).rejects.toMatchObject({ retryAt: until });
		await vi.runAllTimersAsync();
		await failed;
	});
});
