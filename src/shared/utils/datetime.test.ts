import { describe, expect, test } from "vitest";

import { MONTH_NAMES, secondsToString } from "./datetime";

describe("secondsToString", () => {
	test("gets rounding correct", () => {
		expect(secondsToString(59.4)).toBe("0:59");
		expect(secondsToString(59.5)).toBe("1:00");
	});
});

describe("MONTH_NAMES", () => {
	test("maps every month name to its one-based number", () => {
		expect(MONTH_NAMES).toEqual({
			january: 1,
			february: 2,
			march: 3,
			april: 4,
			may: 5,
			june: 6,
			july: 7,
			august: 8,
			september: 9,
			october: 10,
			november: 11,
			december: 12,
		});
	});
});
