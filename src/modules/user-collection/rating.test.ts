import { describe, expect, test } from "vitest";

import { parseRatingSelection, ratingModifier } from "./rating";

describe("ratingModifier", () => {
	test.each([
		[{ mode: "all", from: 0.5, to: 5 }, ""],
		[{ mode: "unrated", from: 0.5, to: 5 }, "r0.0"],
		[{ mode: "rated", from: 0.5, to: 5 }, "r0.5-5.0"],
		[{ mode: "single", from: 3.5, to: 3.5 }, "r3.5"],
		[{ mode: "range", from: 2, to: 4.5 }, "r2.0-4.5"],
	] as const)("converts %s to its collection modifier", (selection, modifier) => {
		expect(ratingModifier(selection)).toBe(modifier);
	});

	test("rejects invalid half-star values and reversed ranges", () => {
		expect(() =>
			ratingModifier({ mode: "single", from: 2.3, to: 2.3 }),
		).toThrow("Choose ratings from 0.5 to 5.0 in half-star steps.");
		expect(() => ratingModifier({ mode: "range", from: 4, to: 2 })).toThrow(
			"The From rating must not exceed the To rating.",
		);
	});
});

describe("parseRatingSelection", () => {
	test("parses special filters and half-star ranges", () => {
		expect(parseRatingSelection()).toEqual({
			mode: "all",
			from: 0.5,
			to: 5,
		});
		expect(parseRatingSelection("r0")).toMatchObject({ mode: "unrated" });
		expect(parseRatingSelection("r0.5-5.0")).toMatchObject({ mode: "rated" });
		expect(parseRatingSelection("r2.5-4")).toEqual({
			mode: "range",
			from: 2.5,
			to: 4,
		});
	});

	test("rejects unsupported and invalid rating modifiers", () => {
		expect(() => parseRatingSelection("rating")).toThrow(
			"Unsupported rating filter: rating",
		);
		expect(() => parseRatingSelection("r5.5")).toThrow(
			"Choose ratings from 0.5 to 5.0 in half-star steps.",
		);
	});
});
