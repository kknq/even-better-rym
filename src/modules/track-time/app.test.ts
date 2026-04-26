import { describe, expect, test } from "vitest";

import { convertTotalTime } from "./convert";

describe("convertTotalTime", () => {
	test("Converts minutes over 60 to hours", () => {
		expect(convertTotalTime("Total length: 75:30")).toBe("1:15:30");
		expect(convertTotalTime("Total length: 120:00")).toBe("2:00:00");
		expect(convertTotalTime("Total length: 61:05")).toBe("1:01:05");
	});

	test("Pads remaining minutes with a leading zero", () => {
		expect(convertTotalTime("Total length: 65:09")).toBe("1:05:09");
	});

	test("Returns null when total is less than 60 minutes", () => {
		expect(convertTotalTime("Total length: 45:20")).toBeNull();
		expect(convertTotalTime("Total length: 59:59")).toBeNull();
	});

	test("Returns null when text does not match expected pattern", () => {
		expect(convertTotalTime("something else")).toBeNull();
		expect(convertTotalTime("")).toBeNull();
	});
});
