import { describe, expect, test } from "vitest";

import {
	decimalYearOf,
	getDayOfYear,
	isLeapYear,
	parseDateFromText,
	parseDateLabelFromText,
	parseDecimalYearFromDateString,
	parseFullDateFromText,
	yearOf,
} from "./date-utils";

describe("isLeapYear and getDayOfYear", () => {
	test("handles leap years, century exceptions, and day totals", () => {
		expect(isLeapYear(2024)).toBe(true);
		expect(isLeapYear(1900)).toBe(false);
		expect(isLeapYear(2000)).toBe(true);
		expect(getDayOfYear(2024, 3, 1)).toBe(61);
		expect(getDayOfYear(2023, 3, 1)).toBe(60);
	});
});

describe("date text parsing", () => {
	test("parses day, month, and year with sensible partial-date defaults", () => {
		expect(parseDateFromText("5 March 2020")).toEqual(new Date(2020, 2, 5));
		expect(parseDateFromText("March 2020")).toEqual(new Date(2020, 2, 15));
		expect(parseDateFromText("Released in 2020")).toEqual(new Date(2020, 0, 1));
		expect(parseFullDateFromText("March 2020")).toBeNull();
		expect(parseFullDateFromText("5 March 2020")).toEqual(new Date(2020, 2, 5));
	});

	test("returns null for unrecognized dates and formats labels", () => {
		expect(parseDateFromText("unknown")).toBeNull();
		expect(parseDateLabelFromText("5 March 2020")).toBe("05 Mar 2020");
		expect(parseDateLabelFromText("March 2020")).toBe("Mar 2020");
		expect(parseDateLabelFromText("Released in 2020")).toBe("2020");
		expect(parseDateLabelFromText("unknown")).toBeNull();
	});

	test("converts parsed dates to decimal years and rejects invalid dates", () => {
		expect(parseDecimalYearFromDateString("unknown")).toBeNull();
		expect(parseDecimalYearFromDateString("2020")).toBe(
			decimalYearOf(new Date(2020, 0, 1)),
		);
		expect(decimalYearOf(new Date(Number.NaN))).toBeNull();
		expect(yearOf(new Date(2020, 0, 1))).toBe(2020);
		expect(yearOf(null)).toBeNull();
	});
});
