import { describe, expect, test, vi } from "vitest";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));

import { toGeoAppleMusicUrl } from "./search";

describe("toGeoAppleMusicUrl", () => {
	test("uses the selected storefront while preserving the item URL", () => {
		expect(
			toGeoAppleMusicUrl(
				"https://music.apple.com/us/album/album-name/123456789?i=987654321",
				"ca",
			),
		).toBe(
			"https://geo.music.apple.com/ca/album/album-name/123456789?i=987654321",
		);
	});

	test("leaves non-Apple Music URLs unchanged", () => {
		expect(toGeoAppleMusicUrl("https://example.com/album", "ca")).toBe(
			"https://example.com/album",
		);
	});
});
