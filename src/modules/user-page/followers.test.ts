// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import * as storage from "~/shared/utils/storage";

import { FOLLOWERS_CACHE_TTL, getFollowers, parseFollowers } from "./followers";

const stored = vi.hoisted(() => new Map<string, unknown>());
vi.mock("~/shared/utils/storage", () => ({
	get: vi.fn((key: string) => Promise.resolve(stored.get(key))),
	set: vi.fn((key: string, value: unknown) => {
		stored.set(key, value);
		return Promise.resolve();
	}),
	getAll: vi.fn(() => Promise.resolve(Object.fromEntries(stored))),
	remove: vi.fn((key: string) => {
		stored.delete(key);
		return Promise.resolve();
	}),
}));

const friendsPage = (
	followers = ["Follower"],
	following = ["NotAFollower"],
) => `
	<div class="header_profile_logged_in">
		<a class="header_profile_main" href="/~Viewer">Viewer</a>
	</div>
	<div class="bubble_header">Users you follow</div>
	<div class="bubble_content">
		${following.map((name) => `<a class="user" href="/~${name}">${name}</a>`).join("")}
	</div>
	<div class="bubble_header">Followers</div>
	<div class="bubble_content">
		<p>Users who are following you (${followers.length}):</p>
		${followers.map((name) => `<a class="user" href="/~${name}">${name}</a><br>`).join("")}
	</div>
`;

const mockResponse = (html = friendsPage()) => ({
	ok: true,
	status: 200,
	text: () => Promise.resolve(html),
});

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
	vi.clearAllMocks();
	stored.clear();
	vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse()));
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("followers page parsing", () => {
	test("reads only followers, not users you follow, and normalizes usernames", () => {
		const html = friendsPage(["FoLlOwEr", "%C3%A9User"]).replace(
			'href="/~FoLlOwEr"',
			`href="${location.origin}/~FoLlOwEr"`,
		);
		expect(parseFollowers(html, "VIEWER")).toEqual(["follower", "éuser"]);
	});

	test("accepts a verified empty list", () => {
		expect(parseFollowers(friendsPage([]), "Viewer")).toEqual([]);
	});

	test.each([
		"<html>Sign in</html>",
		"<html>Checking your browser...</html>",
		friendsPage().replace("/~Viewer", "/~SomeoneElse"),
		friendsPage().replace("(1):", "(2):"),
		friendsPage().replace('href="/~Follower"', 'href="/artist/follower"'),
		friendsPage().replace(
			'href="/~Follower"',
			'href="https://example.com/~Follower"',
		),
		friendsPage().replace("Followers", "Other users"),
	])("rejects unavailable, incomplete, or unexpected pages", (html) => {
		expect(() => parseFollowers(html, "Viewer")).toThrow();
	});
});

describe("followers caching", () => {
	test("reuses the list across profiles and expires it after one minute", async () => {
		expect(await getFollowers("Viewer")).toEqual(["follower"]);
		expect(await getFollowers("VIEWER")).toEqual(["follower"]);
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(storage.set).toHaveBeenCalledWith(
			"user-page.followers.viewer",
			expect.objectContaining({
				expire: Date.now() + FOLLOWERS_CACHE_TTL,
				data: ["follower"],
			}),
		);

		vi.advanceTimersByTime(FOLLOWERS_CACHE_TTL - 1);
		await getFollowers("Viewer");
		expect(fetch).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(2);
		await getFollowers("Viewer");
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test("expired lists bypass both extension and HTTP caches", async () => {
		await getFollowers("Viewer");
		vi.advanceTimersByTime(FOLLOWERS_CACHE_TTL + 1);
		vi.mocked(fetch).mockResolvedValueOnce(
			new Response(friendsPage(["NewFollower"])),
		);
		expect(await getFollowers("Viewer")).toEqual(["newfollower"]);
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(fetch).toHaveBeenLastCalledWith(
			"/friends/Viewer/",
			expect.objectContaining({
				credentials: "same-origin",
				cache: "no-store",
			}),
		);
		expect(await getFollowers("Viewer")).toEqual(["newfollower"]);
	});

	test("keeps accounts separate and deduplicates concurrent requests", async () => {
		await Promise.all([getFollowers("Viewer"), getFollowers("viewer")]);
		expect(fetch).toHaveBeenCalledTimes(1);
		vi.mocked(fetch).mockResolvedValueOnce(
			new Response(
				friendsPage(["DifferentFollower"]).replaceAll("Viewer", "Second"),
			),
		);
		expect(await getFollowers("Second")).toEqual(["differentfollower"]);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test("does not cache HTTP errors or invalid lists and allows retry", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce(new Response("", { status: 429 }))
			.mockResolvedValueOnce(new Response("<html>Blocked</html>"));
		await expect(getFollowers("Viewer")).rejects.toThrow("HTTP 429");
		await expect(getFollowers("Viewer")).rejects.toThrow("expected account");
		expect(storage.set).not.toHaveBeenCalled();
		expect(await getFollowers("Viewer")).toEqual(["follower"]);
	});

	test("aborts stalled requests", async () => {
		vi.mocked(fetch).mockImplementationOnce(
			(_url, options) =>
				new Promise((_resolve, reject) => {
					options?.signal?.addEventListener("abort", () => {
						reject(new Error("Aborted"));
					});
				}),
		);
		const request = expect(getFollowers("Viewer")).rejects.toThrow("Aborted");
		await vi.advanceTimersByTimeAsync(15_000);
		await request;
		expect(storage.set).not.toHaveBeenCalled();
	});
});
