import { describe, expect, test, vi } from "vitest";

vi.mock("~/shared/services", () => ({ SEARCHABLES: [] }));
vi.mock("~/shared/utils/dom", () => ({
	runScript: vi.fn(),
	waitForDocumentReady: vi.fn(),
	waitForElement: vi.fn(),
}));

import { getFullLink } from "./use-page-data";

const appleMusicLink = {
	album: "album-name",
	loc: "us",
	media_id: "123456789",
};

describe("getFullLink for Apple Music", () => {
	test("uses the user's preferred region", () => {
		expect(
			getFullLink("applemusic", appleMusicLink, {
				service_regions: { applemusic: "pl" },
			}),
		).toBe("https://music.apple.com/pl/album/album-name/123456789");
	});

	test("falls back to the link's own region when none is set", () => {
		expect(
			getFullLink("applemusic", appleMusicLink, { service_regions: {} }),
		).toBe("https://music.apple.com/us/album/album-name/123456789");
	});
});
