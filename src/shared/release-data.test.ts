import { describe, expect, test } from "vitest";

import { isSupportedReleasePagePath } from "./release-data";

describe("isSupportedReleasePagePath", () => {
	test("accepts music release pages", () => {
		expect(isSupportedReleasePagePath("/release/artist/title/123456/")).toBe(
			true,
		);
	});

	test("rejects dedicated release review listings", () => {
		expect(
			isSupportedReleasePagePath("/release/artist/title/123456/reviews/"),
		).toBe(false);
	});

	test("rejects unrelated routes", () => {
		expect(isSupportedReleasePagePath("/film/artist/title/123456/")).toBe(
			false,
		);
	});
});
