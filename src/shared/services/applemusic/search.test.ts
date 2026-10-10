import { describe, expect, test, vi } from "vitest";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));

import { toRegionalAppleMusicUrl } from "./search";

describe("toRegionalAppleMusicUrl", () => {
	test("uses the selected storefront while preserving the item URL", () => {
		expect(
			toRegionalAppleMusicUrl(
				"https://music.apple.com/us/album/album-name/123456789?i=987654321",
				"ca",
			),
		).toBe("https://music.apple.com/ca/album/album-name/123456789?i=987654321");
	});

	// Opening a geo.music.apple.com link from Safari leaves a blank tab behind.
	test("keeps the music.apple.com host", () => {
		const url = new URL(
			toRegionalAppleMusicUrl(
				"https://music.apple.com/us/album/album-name/123456789",
				"ca",
			),
		);

		expect(url.hostname).toBe("music.apple.com");
	});

	test("leaves non-Apple Music URLs unchanged", () => {
		expect(toRegionalAppleMusicUrl("https://example.com/album", "ca")).toBe(
			"https://example.com/album",
		);
	});
});
