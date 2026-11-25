// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { addFriendListFollowStatus, main } from "./app";
import { cacheFollowers, getFollowers } from "./followers";

vi.mock("./followers", async (importOriginal) => ({
	...(await importOriginal<typeof import("./followers")>()),
	cacheFollowers: vi.fn(),
	getFollowers: vi.fn(),
}));
vi.mock("~/shared/utils/storage", () => ({}));
vi.mock("~/shared/utils/fetch", () => ({}));
vi.mock("webextension-polyfill", () => ({ default: {} }));

const userCard = (username: string) => `
	<div class="or_card_frame">
		<a href="/~${username}"><img alt="avatar"></a><br>
		<span style="font-size:9px">Profile caption</span>
		<div class="or_card_frame_inner">
			<b class="rtop"></b>
			<span class="card_link"><a class="user" href="/~${username}">${username}</a></span>
			<b class="rbottom"></b>
		</div>
	</div>
`;

beforeEach(() => {
	vi.resetAllMocks();
	window.history.replaceState({}, "", "/friends/Viewer/");
	document.body.innerHTML = `
		<div class="header_profile_logged_in">
			<a class="header_profile_main" href="${location.origin}/~Viewer">Viewer</a>
		</div>
		<div class="bubble_header">[edit]</div>
		<div class="bubble_content">
			<div><span class="ookiig">Users you follow</span><hr>
				${userCard("Follower")}
				${userCard("NotAFollower")}
			</div>
		</div>
		<div class="bubble_header">Followers</div>
		<div class="bubble_content">
			<p>Users who are following you (2):</p>
			<a class="user" href="/~fOlLoWeR">fOlLoWeR</a><br>
			<a class="user" href="/~OnlyAFollower">OnlyAFollower</a><br>
		</div>
	`;
	vi.mocked(cacheFollowers).mockResolvedValue();
});

afterEach(() => {
	vi.restoreAllMocks();
});

test("adds lowercase colored labels directly beneath followed users' names", async () => {
	await main();
	const cards = [...document.querySelectorAll(".card_link")];
	const labels = cards.map((card) =>
		card.querySelector<HTMLSpanElement>(".ebr-follow-status"),
	);
	expect(labels.map((label) => label?.textContent)).toEqual([
		"follows you",
		"does not follow you",
	]);
	expect(labels[0]?.style.color).toContain("--gen-bg-darkgreen");
	expect(labels[1]?.style.color).toBe("rgb(163, 79, 79)");
	for (const label of labels) {
		expect(label?.previousElementSibling?.matches("a.user")).toBe(true);
		expect(label?.style.display).toBe("block");
		expect(label?.getAttribute("aria-busy")).toBe("false");
	}
	expect(document.querySelectorAll(".ebr-follow-status")).toHaveLength(2);
	expect(document.querySelectorAll(".or_card_frame img")).toHaveLength(2);
});

test("uses the displayed followers and refreshes the cache without a network request", async () => {
	await addFriendListFollowStatus();
	expect(getFollowers).not.toHaveBeenCalled();
	expect(cacheFollowers).toHaveBeenCalledExactlyOnceWith("Viewer", [
		"follower",
		"onlyafollower",
	]);
});

test("does not duplicate labels or reprocess an already enhanced list", async () => {
	await addFriendListFollowStatus();
	await addFriendListFollowStatus();
	expect(document.querySelectorAll(".ebr-follow-status")).toHaveLength(2);
	expect(cacheFollowers).toHaveBeenCalledTimes(1);
	expect(document.querySelectorAll(".ebr-follow-status-icon")).toHaveLength(2);
	expect(document.querySelectorAll(".ebr-follow-status-legend")).toHaveLength(
		1,
	);
});

test("marks followers you follow back using outgoing rather than incoming relationships", async () => {
	await main();
	const icons = [
		...document.querySelectorAll<HTMLSpanElement>(".ebr-follow-status-icon"),
	];
	expect(icons.map((icon) => icon.textContent)).toEqual(["\u2713", "\u2717"]);
	expect(icons.map((icon) => icon.getAttribute("aria-label"))).toEqual([
		"you follow them",
		"you do not follow them",
	]);
	expect(icons[0].previousElementSibling?.textContent).toBe("fOlLoWeR");
	expect(icons[0].style.color).toContain("--gen-bg-darkgreen");
	expect(icons[1].previousElementSibling?.textContent).toBe("OnlyAFollower");
	expect(icons[1].style.color).toBe("rgb(163, 79, 79)");
	for (const icon of icons) {
		expect(icon.getAttribute("aria-busy")).toBe("false");
		expect(icon.title).toContain("users you follow displayed on this page");
	}
	expect(getFollowers).not.toHaveBeenCalled();
});

test("places a direction-specific yellow-box legend within the Followers section", async () => {
	await main();
	const legend = document.querySelector(".ebr-follow-status-followers-legend");
	expect(legend?.classList.contains("ebr-follow-status-legend")).toBe(true);
	expect(legend?.getAttribute("aria-label")).toBe("Follow status legend");
	expect(legend?.textContent).toBe(
		"\u2713 you follow them\u2717 you do not follow them",
	);
	expect(legend?.parentElement?.previousElementSibling?.textContent).toBe(
		"Followers",
	);
	expect(legend?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
});

test("marks every follower with a cross when you follow nobody", async () => {
	for (const card of document.querySelectorAll(".or_card_frame")) card.remove();
	await main();
	const icons = [...document.querySelectorAll(".ebr-follow-status-icon")];
	expect(icons).toHaveLength(2);
	expect(icons.every((icon) => icon.textContent === "\u2717")).toBe(true);
	expect(getFollowers).not.toHaveBeenCalled();
});

test("does not guess outgoing relationships when the following section is absent", async () => {
	document.querySelector(".ookiig")?.closest(".bubble_content")?.remove();
	await main();
	expect(document.querySelector(".ebr-follow-status-icon")).toBeNull();
	expect(document.querySelector(".ebr-follow-status-legend")).toBeNull();
});

test("keeps outgoing icons unknown if the following list contains invalid links", async () => {
	const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
	document
		.querySelector(".card_link a")
		?.setAttribute("href", "/artist/not-a-user");
	await main();
	expect(log).toHaveBeenCalledOnce();
	for (const icon of document.querySelectorAll<HTMLSpanElement>(
		".ebr-follow-status-icon",
	)) {
		expect(icon.textContent).toBe("?");
		expect(icon.style.color).toBe("");
		expect(icon.getAttribute("aria-label")).toBe("follow status unavailable");
		expect(icon.title).toContain("Could not read the users you follow");
	}
});

test("handles a verified empty followers list", async () => {
	const heading = [...document.querySelectorAll(".bubble_header")].find(
		(element) => element.textContent === "Followers",
	);
	if (!heading?.nextElementSibling) throw new Error("Missing followers");
	heading.nextElementSibling.innerHTML =
		"<p>Users who are following you (0):</p>";
	await addFriendListFollowStatus();
	expect(
		[...document.querySelectorAll(".ebr-follow-status")].map(
			(e) => e.textContent,
		),
	).toEqual(["does not follow you", "does not follow you"]);
});

test.each([
	"missing",
	"incomplete",
])("shows unavailable rather than false negatives for a %s followers section", async (reason) => {
	const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
	const heading = [...document.querySelectorAll(".bubble_header")].find(
		(element) => element.textContent === "Followers",
	);
	if (!heading?.nextElementSibling) throw new Error("Missing followers");
	if (reason === "missing") heading.remove();
	else heading.nextElementSibling.querySelector("a")?.remove();

	await addFriendListFollowStatus();

	expect(log).toHaveBeenCalledOnce();
	expect(cacheFollowers).not.toHaveBeenCalled();
	for (const label of document.querySelectorAll<HTMLSpanElement>(
		".ebr-follow-status",
	)) {
		expect(label.textContent).toBe("follow status unavailable");
		expect(label.style.color).toBe("");
		expect(label.getAttribute("aria-busy")).toBe("false");
	}
});

test.each([
	"/friends/SomeoneElse/",
	"/friends/Viewer/extra",
	"/~Viewer",
])("does not label another user's friends or non-friends routes (%s)", async (pathname) => {
	window.history.replaceState({}, "", pathname);
	await addFriendListFollowStatus();
	expect(document.querySelector(".ebr-follow-status")).toBeNull();
	expect(cacheFollowers).not.toHaveBeenCalled();
});

test("skips logged-out visitors", async () => {
	document.querySelector(".header_profile_logged_in")?.remove();
	await main();
	expect(document.querySelector(".ebr-follow-status")).toBeNull();
	expect(getFollowers).not.toHaveBeenCalled();
	expect(cacheFollowers).not.toHaveBeenCalled();
});

test("skips lists without followed users", async () => {
	for (const card of document.querySelectorAll(".or_card_frame")) card.remove();
	await main();
	expect(document.querySelector(".ebr-follow-status")).toBeNull();
	expect(cacheFollowers).not.toHaveBeenCalled();
});
