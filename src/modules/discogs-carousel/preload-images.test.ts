import { describe, expect, test, vi } from "vitest";

import { preloadImageUrls } from "./preload-images";

describe("preloadImageUrls", () => {
	test("starts all image loads together and returns the successful images", async () => {
		const requested: string[] = [];
		const preload = vi.fn((url: string) => {
			requested.push(url);
			return Promise.resolve(url);
		});

		await expect(
			preloadImageUrls(["first.jpg", "second.jpg"], preload),
		).resolves.toEqual(["first.jpg", "second.jpg"]);
		expect(requested).toEqual(["first.jpg", "second.jpg"]);
	});

	test("reports an error when none of the images can be loaded", async () => {
		await expect(
			preloadImageUrls(["broken.jpg"], async () => {
				throw new Error("offline");
			}),
		).rejects.toThrow("Could not load Discogs images.");
	});
});
