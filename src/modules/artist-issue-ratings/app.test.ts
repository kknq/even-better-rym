// @vitest-environment jsdom

import { beforeEach, expect, test, vi } from "vitest";
import { loadIssues } from "~/shared/artist-discography";
import { main } from "./app";

vi.mock("~/shared/artist-discography", () => ({ loadIssues: vi.fn() }));
vi.mock("~/shared/utils/messaging", () => ({ sendBackgroundMessage: vi.fn() }));

function row(id: number, status = "2 cataloged") {
	return `<div class="disco_release" id="release_${id}"><span class="disco_cat">
		<span class="disco_cat_inner">${status}</span></span></div>
		<div id="issues_${id}"></div>`;
}

function issues(statuses: string[]) {
	return statuses
		.map(
			(status, index) =>
				`<span class="disco_cat_inner_issue"><span id="disco_cat_catalog_msg_${index}">${status}</span></span>`,
		)
		.join("");
}

function response(statuses: string[]) {
	return new DOMParser().parseFromString(issues(statuses), "text/html");
}

beforeEach(() => {
	vi.resetAllMocks();
	document.body.innerHTML = `<div id="discography">${row(1)}</div>`;
});

test("shows the first rating, average and catalog count while keeping the catalog control", async () => {
	vi.mocked(loadIssues).mockResolvedValue(response(["3.0", "3.5", "Wishlist"]));
	await main();
	await vi.waitFor(() =>
		expect(document.querySelector(".ebr-issue-rating")?.textContent).toBe(
			"3.01st/3.25avg(2)cat.",
		),
	);
	expect(document.querySelector(".disco_cat_inner")?.textContent).toBe(
		"2 cataloged",
	);
	expect(
		document.querySelector(".ebr-issue-rating")?.getAttribute("title"),
	).toBe(
		"First rated issue: 3.0; average of 2 rated issues: 3.25; 2 cataloged. Click to see all issues.",
	);
	expect(
		[...document.querySelectorAll(".ebr-issue-rating-label")].map(
			(element) => element.textContent,
		),
	).toEqual(["1st", "avg", "cat."]);
	expect(
		document
			.querySelector(".disco_release")
			?.getAttribute("data-ebr-issue-rated"),
	).toBe("true");
});

test("handles a single rating, non-ratings and many issues", async () => {
	vi.mocked(loadIssues).mockResolvedValue(
		response(["Wishlist", "3.5 / Listened"]),
	);
	await main();
	await vi.waitFor(() =>
		expect(document.querySelector(".ebr-issue-rating")?.textContent).toBe(
			"3.51st/3.5avg(2)cat.",
		),
	);
	const panel = document.querySelector<HTMLElement>("#issues_1")!;
	panel.innerHTML = issues([
		...Array.from({ length: 25 }, () => "2.0"),
		...Array.from({ length: 25 }, () => "5.0"),
		"Rate",
	]);
	await vi.waitFor(() =>
		expect(document.querySelector(".ebr-issue-rating")?.textContent).toBe(
			"2.01st/3.5avg(2)cat.",
		),
	);
	panel.innerHTML = issues(["Wishlist", "Listened", "Rate", "0", "8.0"]);
	await vi.waitFor(() =>
		expect(document.querySelector(".ebr-issue-rating")).toBeNull(),
	);
	expect(
		document
			.querySelector(".disco_release")
			?.hasAttribute("data-ebr-issue-rated"),
	).toBe(false);
});

test("uses loaded issues, handles dynamic entries and preserves latest edits", async () => {
	let resolve!: (document: Document) => void;
	vi.mocked(loadIssues).mockReturnValue(
		new Promise((done) => {
			resolve = done;
		}),
	);
	await main();
	const panel = document.querySelector<HTMLElement>("#issues_1")!;
	panel.innerHTML = issues(["4.0", "5.0"]);
	await vi.waitFor(() =>
		expect(document.querySelector(".ebr-issue-rating")?.textContent).toBe(
			"4.01st/4.5avg(2)cat.",
		),
	);
	resolve(response(["1.0", "2.0"]));
	await Promise.resolve();
	expect(document.querySelector(".ebr-issue-rating")?.textContent).toBe(
		"4.01st/4.5avg(2)cat.",
	);
	vi.mocked(loadIssues).mockResolvedValue(response(["2.5", "3.5"]));
	document
		.querySelector("#discography")
		?.insertAdjacentHTML("beforeend", row(2));
	await vi.waitFor(() =>
		expect(
			document.querySelector("#release_2 .ebr-issue-rating")?.textContent,
		).toBe("2.51st/3.0avg(2)cat."),
	);
});

test("does not fetch or change ordinary catalog entries", async () => {
	document.body.innerHTML = `<div id="discography">${row(1, "4.0")}${row(2, "Wishlist")}</div>`;
	await main();
	expect(loadIssues).not.toHaveBeenCalled();
	expect(document.querySelector(".ebr-issue-rating")).toBeNull();
});

test("shows loading while requests are pending, then restores or replaces the count", async () => {
	let resolve!: (document: Document) => void;
	vi.mocked(loadIssues).mockReturnValue(
		new Promise((done) => {
			resolve = done;
		}),
	);
	await main();
	const catalog = document.querySelector<HTMLElement>(".disco_cat")!;
	expect(catalog.querySelector(".disco_cat_inner")?.textContent).toBe(
		"2 cataloged",
	);
	expect(
		catalog.querySelector('[role="status"]')?.getAttribute("aria-label"),
	).toBe("Loading issue ratings");
	expect(catalog.classList.contains("ebr-issue-rating-pending")).toBe(true);
	resolve(response(["3.5", "2.5"]));
	await vi.waitFor(() =>
		expect(catalog.querySelector(".ebr-issue-rating")?.textContent).toBe(
			"3.51st/3.0avg(2)cat.",
		),
	);
	expect(catalog.querySelector('[role="status"]')).toBeNull();
	expect(catalog.classList.contains("ebr-issue-rating-pending")).toBe(false);
});

test("removes the loading indicator when a response contains no ratings", async () => {
	vi.mocked(loadIssues).mockResolvedValue(response(["Wishlist", "Listened"]));
	await main();
	await vi.waitFor(() =>
		expect(document.querySelector(".ebr-issue-rating-loading")).toBeNull(),
	);
	expect(document.querySelector(".disco_cat_inner")?.textContent).toBe(
		"2 cataloged",
	);
	expect(document.querySelector(".ebr-issue-rating")).toBeNull();
});

test("updates the count and summary when cataloged issues change", async () => {
	document.body.innerHTML = `<div id="discography">${row(1, "50 cataloged")}</div>`;
	vi.mocked(loadIssues).mockResolvedValue(
		response(["3.5", "2.5", ...Array.from({ length: 48 }, () => "Wishlist")]),
	);
	await main();
	await vi.waitFor(() =>
		expect(document.querySelector(".ebr-issue-rating")?.textContent).toBe(
			"3.51st/3.0avg(50)cat.",
		),
	);
	const panel = document.querySelector<HTMLElement>("#issues_1")!;
	panel.innerHTML = issues(["3.5", "2.5"]);
	document.querySelector<HTMLElement>(".disco_cat_inner")!.textContent =
		"2 cataloged";
	await vi.waitFor(() =>
		expect(document.querySelector(".ebr-issue-rating")?.textContent).toBe(
			"3.51st/3.0avg(2)cat.",
		),
	);
});

test("leaves the catalog count intact on request failure", async () => {
	const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
	vi.mocked(loadIssues).mockRejectedValue(new Error("network"));
	await main();
	await vi.waitFor(() => expect(error).toHaveBeenCalled());
	expect(document.querySelector(".disco_cat_inner")?.textContent).toBe(
		"2 cataloged",
	);
	expect(document.querySelector(".ebr-issue-rating")).toBeNull();
	expect(document.querySelector(".ebr-issue-rating-loading")).toBeNull();
	error.mockRestore();
});
