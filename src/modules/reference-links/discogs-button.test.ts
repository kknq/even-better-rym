// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { findReleaseIssue } from "~/shared/release-data";
import { sendBackgroundMessage } from "~/shared/utils/messaging";
import { createDiscogsButton } from "./discogs-button";

vi.mock("~/shared/release-data", () => ({ findReleaseIssue: vi.fn() }));
vi.mock("~/shared/utils/messaging", () => ({
	sendBackgroundMessage: vi.fn(),
}));

const release = {
	artistName: "Sarah Davachi",
	albumTitle: "The Will of Tongues",
};
let button: HTMLButtonElement;

beforeEach(() => {
	vi.resetAllMocks();
	button = createDiscogsButton(release, "#445566");
	document.body.append(button);
});
afterEach(() => document.body.replaceChildren());

test("uses the reference button color and requests the release on click", async () => {
	vi.mocked(sendBackgroundMessage).mockResolvedValue({
		id: "request",
		type: "discogsSearch",
		data: { url: "https://www.discogs.com/master/4328466" },
	});
	expect(button.textContent).toContain("Search on Discogs");
	expect(button.style.getPropertyValue("--ebr-reference-button-color")).toBe(
		"#445566",
	);
	expect(sendBackgroundMessage).not.toHaveBeenCalled();
	button.click();
	expect(button.disabled).toBe(true);
	expect(button.textContent).toContain("Searching Discogs");
	button.click();
	await vi.waitFor(() => expect(button.disabled).toBe(false));
	expect(sendBackgroundMessage).toHaveBeenCalledExactlyOnceWith({
		type: "discogsSearch",
		data: { release, issue: undefined },
	});
	expect(findReleaseIssue).toHaveBeenCalledOnce();
	expect(button.textContent).toContain("Search on Discogs");
});

test("shows a no-match message and permits retrying", async () => {
	vi.mocked(sendBackgroundMessage).mockResolvedValue({
		id: "request",
		type: "discogsSearch",
		data: {},
	});
	button.click();
	await vi.waitFor(() => expect(button.disabled).toBe(false));
	expect(button.textContent).toContain("No Discogs release found");
	button.click();
	await vi.waitFor(() =>
		expect(sendBackgroundMessage).toHaveBeenCalledTimes(2),
	);
});

test("shows the returned error", async () => {
	vi.mocked(sendBackgroundMessage).mockResolvedValue({
		id: "request",
		type: "discogsSearch",
		data: { error: "Discogs rate limit reached. Please try again later." },
	});
	button.click();
	await vi.waitFor(() => expect(button.disabled).toBe(false));
	expect(button.textContent).toContain("Discogs rate limit reached");
});

test("shows messaging failures", async () => {
	vi.mocked(sendBackgroundMessage).mockRejectedValue(new Error("offline"));
	button.click();
	await vi.waitFor(() => expect(button.disabled).toBe(false));
	expect(button.textContent).toContain("offline");
});
