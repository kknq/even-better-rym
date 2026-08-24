import { describe, expect, it } from "vitest";
import { combineYearRanges, decadeRange, yearRange } from "./chart-date-range";

describe("combineYearRanges", () => {
	it("keeps both bounds when a decade is selected before an earlier year", () => {
		expect(combineYearRanges(decadeRange(1990), yearRange(1985))).toEqual({
			start: 1985,
			end: 1999,
		});
	});

	it("keeps both bounds when a year is selected before a later decade", () => {
		expect(combineYearRanges(yearRange(1985), decadeRange(1990))).toEqual({
			start: 1985,
			end: 1999,
		});
	});
});
