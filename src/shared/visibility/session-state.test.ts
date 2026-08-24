import { describe, expect, it } from "vitest";

import { getVisibilitySessionKey } from "./session-state";

describe("getVisibilitySessionKey", () => {
	it("shares state between collection paths for the same user", () => {
		expect(
			getVisibilitySessionKey("ratings", "/collection/kostylb/recent/24"),
		).toBe(
			getVisibilitySessionKey("ratings", "/collection/kostylb/stag/ambient/"),
		);
	});

	it("shares music and film collection state for the same user", () => {
		expect(
			getVisibilitySessionKey("reviews", "/collection/kostylb/recent/24"),
		).toBe(
			getVisibilitySessionKey("reviews", "/film_collection/kostylb/recent/24"),
		);
	});

	it("keeps state separate for different users", () => {
		expect(getVisibilitySessionKey("ratings", "/collection/kostylb/")).not.toBe(
			getVisibilitySessionKey("ratings", "/collection/another-user/"),
		);
	});
});
