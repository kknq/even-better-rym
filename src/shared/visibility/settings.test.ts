import { describe, expect, it } from "vitest";

import {
	defaultPageSettings,
	defaultRatingSettings,
	defaultReviewSettings,
	mergeRatingSettings,
	mergeReviewSettings,
	visibilityPages,
} from "./settings";

describe("visibility settings", () => {
	it("enables every supported page by default", () => {
		expect(Object.keys(defaultPageSettings())).toEqual(visibilityPages);
		expect(Object.values(defaultPageSettings())).toEqual(
			visibilityPages.map(() => true),
		);
	});

	it("uses the requested rating and review defaults", () => {
		expect(defaultRatingSettings()).toMatchObject({
			ratings: "unrated",
			counts: "scores",
			friends: "after-release-rated",
			tracks: "after-release-rated",
			buttons: true,
			globalButton: false,
		});
		expect(defaultReviewSettings()).toMatchObject({
			reviews: "always",
			friends: "always",
			buttons: true,
			globalButton: false,
			pages: { home: false, release: true, film: true, review: true },
		});
	});

	it("preserves rating defaults when applying partial overrides", () => {
		const settings = mergeRatingSettings({
			ratings: "always",
			pages: { release: false },
		});

		expect(settings.ratings).toBe("always");
		expect(settings.counts).toBe("scores");
		expect(settings.friends).toBe("after-release-rated");
		expect(settings.buttons).toBe(true);
		expect(settings.globalButton).toBe(false);
		expect(settings.pages.release).toBe(false);
		expect(settings.pages.film).toBe(false);
		expect(settings.pages.chart).toBe(true);
	});

	it("preserves review page defaults when applying partial overrides", () => {
		const settings = mergeReviewSettings({ pages: { review: false } });

		expect(settings.pages.review).toBe(false);
		expect(settings.pages.profile).toBe(true);
		expect(settings.pages.release).toBe(true);
		expect(settings.pages.film).toBe(true);
		expect(settings.pages.collection).toBe(true);
		expect(settings.pages).not.toHaveProperty("artist");
		expect(settings.reviews).toBe("always");
	});

	it("migrates the former discovery setting to home and genre pages", () => {
		const settings = mergeRatingSettings({ pages: { discovery: false } });

		expect(settings.pages.home).toBe(false);
		expect(settings.pages.newMusic).toBe(false);
		expect(settings.pages.genre).toBe(false);
	});

	it("uses the former shared release setting for the new film setting", () => {
		expect(mergeRatingSettings({ pages: { release: false } }).pages.film).toBe(
			false,
		);
		expect(mergeReviewSettings({ pages: { release: false } }).pages.film).toBe(
			false,
		);
	});

	it("preserves a separately configured film setting", () => {
		expect(
			mergeRatingSettings({ pages: { release: false, film: true } }).pages,
		).toMatchObject({ release: false, film: true });
	});

	it("keeps review pages limited to supported review locations", () => {
		const settings = mergeReviewSettings({ pages: { home: false } });

		expect(settings.pages.home).toBe(false);
		expect(settings.pages).not.toHaveProperty("newMusic");
	});

	it("replaces the removed friend hide policy with the default", () => {
		const settings = mergeRatingSettings({
			friends: "hide",
		});

		expect(settings.friends).toBe("after-release-rated");
	});

	it("preserves the independent friend hide policy", () => {
		expect(mergeRatingSettings({ friends: "never" }).friends).toBe("never");
		expect(mergeReviewSettings({ friends: "never" }).friends).toBe("never");
	});
});
