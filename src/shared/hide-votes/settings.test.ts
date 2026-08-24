import { describe, expect, it } from "vitest";

import {
	defaultVoteVisibilitySettings,
	mergeVoteVisibilitySettings,
} from "./settings";

describe("vote visibility settings", () => {
	it("hides genre and descriptor votes by default", () => {
		expect(defaultVoteVisibilitySettings()).toEqual({
			genres: true,
			descriptors: true,
		});
	});

	it("preserves defaults when applying partial overrides", () => {
		expect(mergeVoteVisibilitySettings({ genres: false })).toEqual({
			genres: false,
			descriptors: true,
		});
	});
});
