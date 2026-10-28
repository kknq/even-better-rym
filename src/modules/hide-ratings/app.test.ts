// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	defaultRatingSettings,
	type RatingSettings,
} from "~/shared/visibility/settings";
import { main } from "./app";

const mocks = vi.hoisted(() => ({
	getRatingSettings: vi.fn(),
	getSessionVisibility: vi.fn(),
	isOwnProfile: vi.fn(),
	isOwnUserPage: vi.fn(),
}));

vi.mock("~/shared/visibility/settings", async (importOriginal) => ({
	...(await importOriginal<typeof import("~/shared/visibility/settings")>()),
	getRatingSettings: mocks.getRatingSettings,
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

const getSettings = (overrides: Partial<RatingSettings> = {}): RatingSettings =>
	({ ...defaultRatingSettings(), ...overrides }) as RatingSettings;

const setPathname = (pathname: string): void => {
	window.history.replaceState({}, "", pathname);
};

const flushMutationObserver = (): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	document.documentElement.innerHTML = "<head></head><body></body>";
	setPathname("/");
	mocks.getRatingSettings.mockResolvedValue(getSettings());
	mocks.getSessionVisibility.mockReturnValue(null);
	mocks.isOwnProfile.mockReturnValue(false);
	mocks.isOwnUserPage.mockReturnValue(false);
});

afterEach(() => {
	vi.clearAllMocks();
});

describe("Hide Ratings feature", () => {
	it("hides ratings on an unrated release by default", async () => {
		setPathname("/release/album/example");
		document.body.innerHTML = '<div class="avg_rating">4.2</div>';

		await main();

		expect(document.body.classList).toContain("ebr-hide-ratings");
	});

	it("shows ratings on a rated release with the default unrated-only policy", async () => {
		setPathname("/release/album/example");
		document.body.innerHTML = `
			<div class="catalog_line my_rating"></div>
			<div class="avg_rating">4.2</div>
		`;

		await main();

		expect(document.body.classList).not.toContain("ebr-hide-ratings");
		expect(document.body.classList).toContain("ebr-release-rated");
	});

	it("reveals ratings only after the release rating is saved", async () => {
		setPathname("/release/album/example");
		document.body.innerHTML = `
			<div class="release_my_catalog">
				<div class="my_catalog_rating">
					<div class="rating_stars star-0m"></div>
				</div>
			</div>
			<div class="avg_rating">4.2</div>
		`;

		await main();

		const ratingControl = document.querySelector<HTMLElement>(
			".release_my_catalog .my_catalog_rating",
		);
		const stars = ratingControl?.querySelector<HTMLElement>(".rating_stars");
		expect(document.body.classList).toContain("ebr-hide-ratings");

		if (!ratingControl || !stars) throw new Error("Missing release rating UI");
		stars.className = "rating_stars star-8m";
		await flushMutationObserver();
		expect(document.body.classList).toContain("ebr-hide-ratings");

		ratingControl.classList.add("loading");
		await flushMutationObserver();
		stars.className = "rating_stars star-8m";
		ratingControl.classList.remove("loading");
		await flushMutationObserver();

		expect(document.body.classList).not.toContain("ebr-hide-ratings");
		expect(document.body.classList).toContain("ebr-release-rated");
	});

	it("hides ratings on rated releases when the always-hide policy is selected", async () => {
		setPathname("/release/album/example");
		document.body.innerHTML = '<div class="catalog_line my_rating"></div>';
		mocks.getRatingSettings.mockResolvedValue(
			getSettings({ ratings: "always" }),
		);

		await main();

		expect(document.body.classList).toContain("ebr-hide-ratings");
		expect(document.body.classList).toContain("ebr-hide-all-ratings");
	});

	it.each([
		["always", true],
		["after-release-rated", true],
		["never", false],
	] as const)("applies the %s friend-rating policy on rated releases", async (friends, shouldShow) => {
		setPathname("/release/album/example");
		document.body.innerHTML = '<div class="catalog_line my_rating"></div>';
		mocks.getRatingSettings.mockResolvedValue(getSettings({ friends }));

		await main();

		expect(document.body.classList.contains("ebr-show-friends")).toBe(
			shouldShow,
		);
	});

	it("applies rating visibility to song pages as a generic page", async () => {
		setPathname("/song/the-beatles/here-comes-the-sun/");
		document.body.innerHTML =
			'<div class="page_section_main_info_music_rating_value_rating">4.6</div>';

		await main();

		expect(document.body.classList).toContain("ebr-hide-ratings");
		expect(document.getElementById("ebr-hide-ratings-styles")).not.toBeNull();
	});

	it("applies the hide-counts setting independently from score visibility", async () => {
		setPathname("/charts/top/album/2026");
		mocks.getRatingSettings.mockResolvedValue(
			getSettings({ counts: "scores-and-counts" }),
		);

		await main();

		expect(document.body.classList).toContain("ebr-hide-rating-counts");
		expect(document.body.classList).toContain("ebr-hide-ratings");
	});

	describe.each([
		["label", "/label/cash-money-records/"],
		["classifier", "/classifiers/Tha+Carter/"],
	] as const)("%s pages", (page, pathname) => {
		it("hides ratings and supports revealing and re-hiding them", async () => {
			setPathname(pathname);

			await main();

			const button = document.getElementById("ebr-show-rating-btn-generic");
			if (!button) throw new Error("Missing floating rating control");
			expect(document.body.classList).toContain("ebr-hide-ratings");
			button.click();
			expect(document.body.classList).not.toContain("ebr-hide-ratings");
			button.click();
			expect(document.body.classList).toContain("ebr-hide-ratings");
		});

		it("respects the independent page setting", async () => {
			setPathname(pathname);
			mocks.getRatingSettings.mockResolvedValue(
				getSettings({
					pages: { ...defaultRatingSettings().pages, [page]: false },
				}),
			);

			await main();

			expect(document.body.classList).not.toContain("ebr-hide-ratings");
			expect(document.getElementById("ebr-show-rating-btn-generic")).toBeNull();
		});

		it("respects the hide-counts and disabled-button settings", async () => {
			setPathname(pathname);
			mocks.getRatingSettings.mockResolvedValue(
				getSettings({ counts: "scores-and-counts", buttons: false }),
			);

			await main();

			expect(document.body.classList).toContain("ebr-hide-rating-counts");
			expect(document.body.classList).toContain("ebr-hide-ratings");
			expect(document.getElementById("ebr-show-rating-btn-generic")).toBeNull();
		});
	});

	it.each([
		"/classifiers/",
		"/classifiers",
	])("does not show rating controls on the classifier index at %s", async (pathname) => {
		setPathname(pathname);
		mocks.getRatingSettings.mockResolvedValue(
			getSettings({ buttons: true, globalButton: true }),
		);

		await main();

		expect(document.body.classList).not.toContain("ebr-hide-ratings");
		expect(document.querySelector(".ebr-rating-toggle")).toBeNull();
	});

	it("shows own-rated profile releases while hiding other profile ratings", async () => {
		setPathname("/artist/example");
		document.body.innerHTML = `
			<div class="disco_release">
				<span class="disco_cat_inner">8.0</span>
				<span class="disco_avg_rating">4.2</span>
			</div>
			<div class="disco_release">
				<span class="disco_cat_inner">Not rated</span>
				<span class="disco_avg_rating">3.8</span>
			</div>
		`;

		await main();

		const [ownRelease, otherRelease] =
			document.querySelectorAll(".disco_release");
		expect(ownRelease.querySelector(".disco_avg_rating")?.classList).toContain(
			"ebr-rating-visible",
		);
		expect(
			otherRelease.querySelector(".disco_avg_rating")?.classList,
		).not.toContain("ebr-rating-visible");
	});

	it("lets the generic control show and re-hide page ratings", async () => {
		setPathname("/song/the-beatles/here-comes-the-sun/");
		mocks.getRatingSettings.mockResolvedValue(getSettings({ buttons: true }));

		await main();

		const button = document.getElementById(
			"ebr-show-rating-btn-generic",
		) as HTMLButtonElement;
		expect(document.body.classList).toContain("ebr-hide-ratings");
		button.click();
		expect(document.body.classList).not.toContain("ebr-hide-ratings");
		button.click();
		expect(document.body.classList).toContain("ebr-hide-ratings");
	});

	it("leaves feature-disabled pages unchanged", async () => {
		setPathname("/song/the-beatles/here-comes-the-sun/");
		mocks.getRatingSettings.mockResolvedValue(
			getSettings({ pages: { ...defaultRatingSettings().pages, song: false } }),
		);

		await main();

		expect(document.body.classList).not.toContain("ebr-hide-ratings");
		expect(document.getElementById("ebr-hide-ratings-styles")).toBeNull();
	});
});
