import { describe, expect, test, vi } from "vitest";

import { createSecondaryImageLoader } from "./image-loader";

describe("createSecondaryImageLoader", () => {
	test("does not load until requested", async () => {
		const load = vi.fn().mockResolvedValue(["image"]);
		const loadImages = createSecondaryImageLoader(load);

		expect(load).not.toHaveBeenCalled();
		await expect(loadImages()).resolves.toEqual(["image"]);
		expect(load).toHaveBeenCalledTimes(1);
	});

	test("retries after a failed load and caches a successful result", async () => {
		const load = vi
			.fn<() => Promise<string[]>>()
			.mockRejectedValueOnce(new Error("offline"))
			.mockResolvedValueOnce(["https://example.com/image.jpg"]);
		const loadImages = createSecondaryImageLoader(load);

		await expect(loadImages()).rejects.toThrow("offline");
		await expect(loadImages()).resolves.toEqual([
			"https://example.com/image.jpg",
		]);
		await expect(loadImages()).resolves.toEqual([
			"https://example.com/image.jpg",
		]);
		expect(load).toHaveBeenCalledTimes(2);
	});

	test("retries an empty result on the next request", async () => {
		const load = vi
			.fn<() => Promise<string[]>>()
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce(["https://example.com/image.jpg"]);
		const loadImages = createSecondaryImageLoader(load);

		await expect(loadImages()).resolves.toEqual([]);
		await expect(loadImages()).resolves.toEqual([
			"https://example.com/image.jpg",
		]);
		expect(load).toHaveBeenCalledTimes(2);
	});
});
