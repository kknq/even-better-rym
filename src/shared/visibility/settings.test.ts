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

	it("uses the rating and review defaults", () => {
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
		expect(settings.pages.film).toBe(true);
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

	it("adds recommendations to existing rating settings without changing choices", () => {
		const settings = mergeRatingSettings({
			pages: { release: false, home: false },
		});

		expect(settings.pages.recommendations).toBe(true);
		expect(settings.pages.release).toBe(false);
		expect(settings.pages.home).toBe(false);
		expect(
			mergeRatingSettings({ pages: { recommendations: false } }).pages
				.recommendations,
		).toBe(false);
		expect(defaultReviewSettings().pages).not.toHaveProperty("recommendations");
	});

	it("keeps release and film page settings independent", () => {
		for (const merge of [mergeRatingSettings, mergeReviewSettings]) {
			expect(merge({ pages: { release: false } }).pages).toMatchObject({
				release: false,
				film: true,
			});
			expect(merge({ pages: { film: false } }).pages).toMatchObject({
				release: true,
				film: false,
			});
		}
	});

	it("keeps home, new music, and genre page settings independent", () => {
		expect(mergeRatingSettings({ pages: { home: false } }).pages).toMatchObject(
			{ home: false, newMusic: true, genre: true },
		);
	});

	it("keeps review pages limited to supported review locations", () => {
		const settings = mergeReviewSettings({ pages: { home: false } });

		expect(settings.pages.home).toBe(false);
		expect(settings.pages).not.toHaveProperty("newMusic");
	});

	it.each([
		"always",
		"after-release-rated",
		"never",
	] as const)("preserves the %s friend visibility policy", (friends) => {
		expect(mergeRatingSettings({ friends }).friends).toBe(friends);
		expect(mergeReviewSettings({ friends }).friends).toBe(friends);
	});
});
