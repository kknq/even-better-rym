// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	defaultRatingSettings,
	defaultReviewSettings,
	type ReviewSettings,
} from "~/shared/visibility/settings";
import { setupReleasePage } from "../hide-ratings/release-page";
import { main } from "./app";

const mocks = vi.hoisted(() => ({
	getReviewSettings: vi.fn(),
	getSessionVisibility: vi.fn(),
	isOwnProfile: vi.fn(),
	isOwnUserPage: vi.fn(),
}));

vi.mock("~/shared/visibility/settings", async (importOriginal) => ({
	...(await importOriginal<typeof import("~/shared/visibility/settings")>()),
	getReviewSettings: mocks.getReviewSettings,
}));

vi.mock("~/shared/visibility/session-state", () => ({
	getSessionVisibility: mocks.getSessionVisibility,
	setSessionVisibility: vi.fn(),
}));

vi.mock("~/shared/utils/user", () => ({
	isOwnProfile: mocks.isOwnProfile,
	isOwnUserPage: mocks.isOwnUserPage,
}));

vi.mock("~/shared/utils/dom", () => ({
	waitForDocumentReady: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("~/shared/utils/storage", () => ({
	get: vi.fn(),
	getAll: vi.fn(),
	set: vi.fn(),
	remove: vi.fn(),
}));

const getSettings = (
	overrides: Partial<ReviewSettings> = {},
): ReviewSettings => ({ ...defaultReviewSettings(), ...overrides });

const setPathname = (pathname: string): void => {
	window.history.replaceState({}, "", pathname);
};

const flushMutationObserver = (): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	document.documentElement.removeAttribute("id");
	document.documentElement.innerHTML = "<head></head><body></body>";
	setPathname("/");
	mocks.getReviewSettings.mockResolvedValue(getSettings());
	mocks.getSessionVisibility.mockReturnValue(null);
	mocks.isOwnProfile.mockReturnValue(false);
	mocks.isOwnUserPage.mockReturnValue(false);
});

afterEach(() => {
	vi.clearAllMocks();
});

describe("Hide Reviews feature", () => {
	it.each([
		true,
		false,
	])("gates compact release spacing on page enablement (%s), not button visibility", async (enabled) => {
		setPathname("/release/album/example/");
		document.body.innerHTML = '<div class="release_my_catalog"></div>';
		mocks.getReviewSettings.mockResolvedValue(
			getSettings({
				buttons: false,
				pages: { ...defaultReviewSettings().pages, release: enabled },
			}),
		);

		await main();

		expect(
			document.body.classList.contains("ebr-release-visibility-enabled"),
		).toBe(enabled);
		expect(document.querySelector(".ebr-release-visibility")).toBeNull();
	});

	it.each([
		"/latest",
		"/release/album/example/reviews/",
	])("does not compact catalog headings on %s", async (pathname) => {
		setPathname(pathname);

		await main();

		expect(document.body.classList).not.toContain(
			"ebr-release-visibility-enabled",
		);
	});

	it.each([
		["release", "ratings-first"],
		["release", "reviews-first"],
		["film", "ratings-first"],
		["film", "reviews-first"],
	])("shares a separate section on %s pages when loaded %s", async (page, order) => {
		document.documentElement.id =
			page === "film" ? "page_film" : "page_release";
		setPathname(page === "film" ? "/film/example/" : "/release/album/example/");
		document.body.innerHTML = `
			<div class="section_my_catalog">
				<div class="release_my_catalog">
					<div class="my_catalog_format">Vinyl</div>
					<div class="my_catalog_tags">My tags</div>
					<div class="my_catalog_review"><div id="review_btn">Review</div></div>
					<div class="my_catalog_rate_tracks"><div id="track_rating_btn">Track ratings</div></div>
				</div>
			</div>
		`;
		const catalog = document.querySelector(".section_my_catalog")?.innerHTML;
		mocks.getReviewSettings.mockResolvedValue(getSettings({ buttons: true }));

		if (order === "ratings-first")
			setupReleasePage(defaultRatingSettings(), true);
		await main();
		if (order === "reviews-first")
			setupReleasePage(defaultRatingSettings(), true);

		const controls = document.getElementById("ebr-release-visibility-controls");
		expect(document.querySelectorAll(".ebr-release-visibility")).toHaveLength(
			1,
		);
		expect(controls?.children).toHaveLength(2);
		expect(controls?.firstElementChild?.id).toBe(
			"ebr-show-rating-btn-release-wrapper",
		);
		expect(controls?.lastElementChild?.id).toBe(
			"ebr-show-review-btn-release-wrapper",
		);
		expect(document.querySelector(".section_my_catalog")?.innerHTML).toBe(
			catalog,
		);

		const button = document.getElementById("ebr-show-review-btn-release");
		button?.click();
		expect(document.body.classList).not.toContain("ebr-hide-reviews");
		button?.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
		);
		expect(document.body.classList).toContain("ebr-hide-reviews");
	});

	it("creates the section with reviews enabled on their own", async () => {
		setPathname("/release/album/example/");
		document.body.innerHTML = '<div class="release_my_catalog"></div>';
		mocks.getReviewSettings.mockResolvedValue(getSettings({ buttons: true }));

		await main();
		await main();

		const controls = document.getElementById("ebr-release-visibility-controls");
		expect(controls?.children).toHaveLength(1);
		expect(
			controls?.querySelector("#ebr-show-review-btn-release"),
		).not.toBeNull();
		expect(document.getElementById("ebr-show-rating-btn")).toBeNull();
	});

	it.each([
		"buy",
		"buy/",
		"coverart",
		"coverart/",
	])("skips controls and releases bootstrap visibility on release %s pages", async (subpage) => {
		setPathname(
			`/release/album/%E5%8A%A3/%E5%9E%83%E5%9C%BE%E5%9C%BA/${subpage}`,
		);
		document.body.innerHTML = '<div id="content"></div>';
		mocks.getReviewSettings.mockResolvedValue(
			getSettings({ buttons: true, globalButton: true }),
		);

		await main();
		vi.resetModules();
		await import("./main");

		expect(document.body.innerHTML).toBe('<div id="content"></div>');
		expect(document.body.classList).not.toContain("ebr-hide-reviews");
		expect(document.getElementById("ebr-hide-reviews-styles")).toBeNull();
		expect(document.documentElement.classList).toContain("ebr-reviews-ready");
		expect(document.documentElement.classList).not.toContain(
			"ebr-reviews-pending",
		);
	});

	it("hides reviews on release pages by default", async () => {
		setPathname("/release/album/example");
		document.body.innerHTML = '<div class="review_body">Review text</div>';

		await main();

		expect(document.body.classList).toContain("ebr-hide-reviews");
	});

	it("shows reviews on rated releases with the unrated-only policy", async () => {
		setPathname("/release/album/example");
		document.body.innerHTML = `
			<div class="catalog_line my_rating"></div>
			<div class="review_body">Review text</div>
		`;
		mocks.getReviewSettings.mockResolvedValue(
			getSettings({ reviews: "unrated" }),
		);

		await main();

		expect(document.body.classList).not.toContain("ebr-hide-reviews");
	});

	it("reveals reviews only after the release rating is saved", async () => {
		setPathname("/release/album/example");
		document.body.innerHTML = `
			<div class="release_my_catalog">
				<div class="my_catalog_rating">
					<div class="rating_stars star-0m"></div>
				</div>
			</div>
			<div class="review_body">Review text</div>
		`;
		mocks.getReviewSettings.mockResolvedValue(
			getSettings({ reviews: "unrated" }),
		);

		await main();

		const ratingControl = document.querySelector<HTMLElement>(
			".release_my_catalog .my_catalog_rating",
		);
		const stars = ratingControl?.querySelector<HTMLElement>(".rating_stars");
		expect(document.body.classList).toContain("ebr-hide-reviews");

		if (!ratingControl || !stars) throw new Error("Missing release rating UI");
		stars.className = "rating_stars star-8m";
		await flushMutationObserver();
		expect(document.body.classList).toContain("ebr-hide-reviews");

		ratingControl.classList.add("loading");
		await flushMutationObserver();
		stars.className = "rating_stars star-8m";
		ratingControl.classList.remove("loading");
		await flushMutationObserver();

		expect(document.body.classList).not.toContain("ebr-hide-reviews");
	});

	it("shows friend reviews while hiding other reviews when configured", async () => {
		setPathname("/release/album/example");
		document.body.innerHTML = `
			<div class="review_header friend"></div>
			<div class="review_body friend-review">Friend review</div>
			<div class="review_body other-review">Other review</div>
		`;
		mocks.getReviewSettings.mockResolvedValue(
			getSettings({ friends: "always" }),
		);

		await main();

		expect(document.body.classList).toContain("ebr-hide-reviews");
		expect(document.body.classList).toContain("ebr-show-friend-reviews");
	});

	it("keeps rating visibility independent from review visibility", async () => {
		setPathname("/latest");
		document.body.classList.add("ebr-hide-ratings");
		mocks.getReviewSettings.mockResolvedValue(
			getSettings({ reviews: "always" }),
		);

		await main();

		expect(document.body.classList).toContain("ebr-hide-ratings");
		expect(document.body.classList).toContain("ebr-hide-reviews");
	});

	it("applies to supported review-list pages", async () => {
		setPathname("/latest");
		document.body.innerHTML = '<div class="review_text">Review text</div>';

		await main();

		expect(document.body.classList).toContain("ebr-hide-reviews");
		expect(document.getElementById("ebr-hide-reviews-styles")).not.toBeNull();
	});

	it("honors session visibility for review listing routes", async () => {
		setPathname("/release/album/example/reviews/");
		mocks.getSessionVisibility.mockReturnValue(true);
		document.body.innerHTML = '<div class="review_body">Review text</div>';

		await main();

		expect(document.body.classList).not.toContain("ebr-hide-reviews");
	});

	it("lets the generic control show and re-hide reviews", async () => {
		setPathname("/latest");
		mocks.getReviewSettings.mockResolvedValue(getSettings({ buttons: true }));

		await main();

		const button = document.getElementById(
			"ebr-show-review-btn-generic",
		) as HTMLButtonElement;
		expect(document.body.classList).toContain("ebr-hide-reviews");
		button.click();
		expect(document.body.classList).not.toContain("ebr-hide-reviews");
		button.click();
		expect(document.body.classList).toContain("ebr-hide-reviews");
	});

	it("leaves feature-disabled pages unchanged", async () => {
		setPathname("/release/album/example");
		mocks.getReviewSettings.mockResolvedValue(
			getSettings({
				pages: { ...defaultReviewSettings().pages, release: false },
			}),
		);

		await main();

		expect(document.body.classList).not.toContain("ebr-hide-reviews");
		expect(document.getElementById("ebr-hide-reviews-styles")).toBeNull();
	});
});
