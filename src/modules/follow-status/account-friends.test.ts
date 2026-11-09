// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { main } from "./app";
import { getFollowers } from "./followers";

vi.mock("./followers", () => ({ getFollowers: vi.fn() }));
vi.mock("webextension-polyfill", () => ({ default: {} }));

beforeEach(() => {
	vi.resetAllMocks();
	window.history.replaceState({}, "", "/account/friends/");
	document.body.innerHTML = `
		<div class="header_profile_logged_in">
			<a class="header_profile_main" href="/~Viewer">Viewer</a>
		</div>
		<div class="ui_breadcrumb_frame">
			<ol id="page_breadcrumb">
				<li id="ui_breadcrumb_item_page_breadcrumb"><span>Viewer's friends</span></li>
			</ol>
			<div class="clearfix"></div>
		</div>
		<div class="bubble_header">recently updated</div>
		<div class="bubble_content">
			<table class="mbgen"><tbody>
				<tr><td><a class="user" href="/~Follower">Follower</a></td><td>Today</td></tr>
				<tr><td></td><td><a href="/list/Follower/example">List title</a>
					<div class="review"><a class="user" href="/~Unrelated">Unrelated</a></div>
				</td></tr>
				<tr><td><a class="user" href="/~NotAFollower">NotAFollower</a></td><td>Yesterday</td></tr>
				<tr><td><a class="user" href="/~Follower">Follower</a></td><td>Yesterday</td></tr>
			</tbody></table>
		</div>
		<div class="bubble_header">online status</div>
		<div class="bubble_content">
			Online<br><hr><a class="user" href="/~FOLLOWER">FOLLOWER</a><br>
			Offline<br><hr><a class="user" href="/~NotAFollower">NotAFollower</a><br>
			<a href="/account/contacts_edit">edit friends list</a>
		</div>
		<div class="bubble_header">Unrelated section</div>
		<div class="bubble_content"><a class="user" href="/~Unrelated">Unrelated</a></div>
	`;
	vi.mocked(getFollowers).mockResolvedValue(["follower"]);
});

afterEach(() => {
	vi.restoreAllMocks();
});

test("adds green ticks and muted-red crosses in activity and online/offline lists", async () => {
	await main();
	const icons = [
		...document.querySelectorAll<HTMLSpanElement>(".ebr-follow-status-icon"),
	];
	expect(icons.map((icon) => icon.textContent)).toEqual([
		"\u2713",
		"\u2717",
		"\u2713",
		"\u2713",
		"\u2717",
	]);
	for (const icon of icons) {
		const followsYou = icon.textContent === "\u2713";
		expect(icon.style.color).toBe(
			followsYou ? "var(--gen-bg-darkgreen, #2a6b2a)" : "rgb(163, 79, 79)",
		);
		expect(icon.getAttribute("aria-label")).toBe(
			followsYou ? "follows you" : "does not follow you",
		);
		expect(icon.title).toContain("cached for up to one minute");
		expect(icon.getAttribute("aria-busy")).toBe("false");
		expect(icon.previousElementSibling?.matches("a.user")).toBe(true);
	}
	expect(getFollowers).toHaveBeenCalledExactlyOnceWith("Viewer");
	expect(
		document.querySelectorAll(
			'a[href="/~Unrelated"] + .ebr-follow-status-icon',
		),
	).toHaveLength(0);
	expect(
		document.querySelector(
			'a[href="/account/contacts_edit"] + .ebr-follow-status-icon',
		),
	).toBeNull();
});

test("puts an explanatory legend alongside the friends heading without changing its text", async () => {
	await main();
	const frame = document.querySelector(".ui_breadcrumb_frame");
	const legend = frame?.querySelector(".ebr-follow-status-legend");
	expect(frame?.classList.contains("ebr-follow-status-heading")).toBe(true);
	expect(legend?.getAttribute("aria-label")).toBe("Follow status legend");
	expect(legend?.textContent).toBe(
		"\u2713 follows you\u2717 does not follow you",
	);
	expect(
		document.querySelector("#ui_breadcrumb_item_page_breadcrumb")?.textContent,
	).toBe("Viewer's friends");
	expect(legend?.previousElementSibling?.className).toBe("clearfix");
});

test("does not duplicate icons or the legend on repeated initialization", async () => {
	await main();
	await main();
	expect(document.querySelectorAll(".ebr-follow-status-icon")).toHaveLength(5);
	expect(document.querySelectorAll(".ebr-follow-status-legend")).toHaveLength(
		1,
	);
	expect(getFollowers).toHaveBeenCalledTimes(1);
});

test("shows a neutral loading indicator until the shared followers request completes", async () => {
	const followers = Promise.withResolvers<string[]>();
	vi.mocked(getFollowers).mockReturnValueOnce(followers.promise);
	const request = main();
	await vi.waitFor(() => {
		expect(getFollowers).toHaveBeenCalledOnce();
	});
	const icons = [
		...document.querySelectorAll<HTMLSpanElement>(".ebr-follow-status-icon"),
	];
	expect(icons).toHaveLength(5);
	for (const icon of icons) {
		expect(icon.textContent).toBe("...");
		expect(icon.style.color).toBe("");
		expect(icon.getAttribute("aria-busy")).toBe("true");
	}
	followers.resolve([]);
	await request;
	expect(icons.every((icon) => icon.textContent === "\u2717")).toBe(true);
});

test("uses neutral question marks rather than false crosses when followers cannot load", async () => {
	const error = new Error("HTTP 403");
	const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
	vi.mocked(getFollowers).mockRejectedValueOnce(error);
	await main();
	for (const icon of document.querySelectorAll<HTMLSpanElement>(
		".ebr-follow-status-icon",
	)) {
		expect(icon.textContent).toBe("?");
		expect(icon.style.color).toBe("");
		expect(icon.getAttribute("aria-label")).toBe("follow status unavailable");
		expect(icon.getAttribute("aria-busy")).toBe("false");
		expect(icon.title).toContain("Reload the page");
	}
	expect(log).toHaveBeenCalledWith(
		"EvenBetterRYM: could not load follow status",
		error,
	);
});

test("also supports the URL without a trailing slash", async () => {
	window.history.replaceState({}, "", "/account/friends");
	await main();
	expect(document.querySelectorAll(".ebr-follow-status-icon")).toHaveLength(5);
});

test.each([
	"/account/friends/extra",
	"/account/contacts_edit",
])("does not alter other account pages (%s)", async (pathname) => {
	window.history.replaceState({}, "", pathname);
	await main();
	expect(document.querySelector(".ebr-follow-status-icon")).toBeNull();
	expect(document.querySelector(".ebr-follow-status-legend")).toBeNull();
	expect(getFollowers).not.toHaveBeenCalled();
});

test("skips logged-out visitors", async () => {
	document.querySelector(".header_profile_logged_in")?.remove();
	await main();
	expect(document.querySelector(".ebr-follow-status-icon")).toBeNull();
	expect(document.querySelector(".ebr-follow-status-legend")).toBeNull();
	expect(getFollowers).not.toHaveBeenCalled();
});

test("does not require a heading to annotate the user lists", async () => {
	document.querySelector(".ui_breadcrumb_frame")?.remove();
	await main();
	expect(document.querySelectorAll(".ebr-follow-status-icon")).toHaveLength(5);
	expect(document.querySelector(".ebr-follow-status-legend")).toBeNull();
});
