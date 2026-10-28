// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	defaultReviewSettings,
	type ReviewSettings,
} from "~/shared/visibility/settings";
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
