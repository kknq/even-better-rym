// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { addFollowStatus } from "./app";
import { getFollowers } from "./followers";

vi.mock("./followers", () => ({ getFollowers: vi.fn() }));
vi.mock("webextension-polyfill", () => ({ default: {} }));

beforeEach(() => {
	vi.resetAllMocks();
	window.history.replaceState({}, "", "/~OtherUser");
	document.body.innerHTML = `
		<div class="header_profile_logged_in">
			<a class="header_profile_main" href="${location.origin}/~Viewer">Viewer</a>
		</div>
		<div class="profilehii">
			<table class="mbgen"><tbody>
				<tr><td colspan="5">Profile name</td></tr>
				<tr><td colspan="5"><a href="/location/example">Location</a></td></tr>
				<tr><td colspan="5">Additional profile information</td></tr>
			</tbody></table>
		</div>
	`;
	vi.mocked(getFollowers).mockResolvedValue(["otheruser"]);
});

afterEach(() => {
	vi.restoreAllMocks();
});

test("adds a lowercase green follows-you label as the bottom metadata row", async () => {
	await addFollowStatus();
	const row = document.querySelector(".ebr-follow-status");
	expect(row?.previousElementSibling?.textContent).toBe(
		"Additional profile information",
	);
	const table = document.querySelector<HTMLTableElement>(".profilehii table");
	expect(table?.rows[table.rows.length - 1]).toBe(row);
	expect(row?.querySelector("td")?.colSpan).toBe(5);
	const status = row?.querySelector<HTMLElement>('[role="status"]');
	expect(status?.textContent).toBe("follows you");
	expect(status?.style.color).toContain("--gen-bg-darkgreen");
	expect(status?.getAttribute("aria-busy")).toBe("false");
	expect(getFollowers).toHaveBeenCalledWith("Viewer");
	expect(row?.querySelector("button")).toBeNull();
});

test("shows non-followers in muted red", async () => {
	vi.mocked(getFollowers).mockResolvedValue(["someoneelse"]);
	await addFollowStatus();
	const status = document.querySelector<HTMLElement>('[role="status"]');
	expect(status?.textContent).toBe("does not follow you");
	expect(status?.style.color).toBe("rgb(163, 79, 79)");
});

test("shows the loading status without a refresh button during the request", async () => {
	let complete: (followers: string[]) => void = () => {
		throw new Error("Request has not started");
	};
	vi.mocked(getFollowers).mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				complete = resolve;
			}),
	);
	const request = addFollowStatus();
	const status = document.querySelector('[role="status"]');
	expect(status?.textContent).toBe("checking follow status...");
	expect(status?.getAttribute("aria-busy")).toBe("true");
	expect(document.querySelector(".ebr-follow-status button")).toBeNull();
	complete([]);
	await request;
	expect(status?.getAttribute("aria-busy")).toBe("false");
	expect(status?.textContent).toBe("does not follow you");
});

test("shows an explicit failure rather than a false negative, without a button", async () => {
	const error = new Error("Rate limited");
	const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
	vi.mocked(getFollowers).mockRejectedValueOnce(error);
	await addFollowStatus();
	expect(document.querySelector('[role="status"]')?.textContent).toBe(
		"follow status unavailable",
	);
	expect(log).toHaveBeenCalledWith(
		"EvenBetterRYM: could not load follow status",
		error,
	);
	expect(document.querySelector(".ebr-follow-status button")).toBeNull();
	expect(document.querySelector('[role="status"]')?.getAttribute("title")).toBe(
		"Could not load your followers. Reload the page to try again.",
	);
});

test("uses the metadata table even when no location is set, without duplicating rows", async () => {
	document.querySelector('a[href^="/location/"]')?.closest("tr")?.remove();
	await addFollowStatus();
	await addFollowStatus();
	expect(document.querySelectorAll(".ebr-follow-status")).toHaveLength(1);
	expect(
		document.querySelector(".ebr-follow-status")?.nextElementSibling,
	).toBeNull();
	expect(getFollowers).toHaveBeenCalledTimes(1);
});

test.each([
	"/~VIEWER",
	"/~OtherUser/data/rss",
])("skips own profiles and non-profile routes (%s)", async (path) => {
	window.history.replaceState({}, "", path);
	await addFollowStatus();
	expect(getFollowers).not.toHaveBeenCalled();
	expect(document.querySelector(".ebr-follow-status")).toBeNull();
});

test("skips logged-out visitors and unavailable profiles", async () => {
	document.querySelector(".header_profile_logged_in")?.remove();
	await addFollowStatus();
	expect(getFollowers).not.toHaveBeenCalled();
});
