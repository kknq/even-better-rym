import { describe, expect, test } from "vitest";

import { getReleaseTypeFromPath } from "./release-type";

describe("getReleaseTypeFromPath", () => {
	test("recognizes single and music video stream routes", () => {
		expect(getReleaseTypeFromPath("/artist/single/title")).toBe("single");
		expect(getReleaseTypeFromPath("/artist/musicvideo/title")).toBe(
			"music video",
		);
	});

	test("returns undefined for other or incomplete routes", () => {
		expect(getReleaseTypeFromPath("/artist/album/title")).toBeUndefined();
		expect(getReleaseTypeFromPath("/artist")).toBeUndefined();
	});
});
