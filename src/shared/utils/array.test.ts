import { describe, expect, test, vi } from "vitest";

import {
	asArray,
	chunkArray,
	equals,
	findLastIndex,
	groupBy,
	uniqueBy,
} from "./array";

describe("chunkArray", () => {
	test("splits an array into chunks and retains the final partial chunk", () => {
		expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
	});

	test("returns no chunks for an empty array", () => {
		expect(chunkArray([], 3)).toEqual([]);
	});
});

describe("findLastIndex", () => {
	test("searches from the end and passes the original index and array", () => {
		const values = [2, 5, 8, 11];
		const predicate = vi.fn((value: number) => value % 2 === 0);

		expect(findLastIndex(values, predicate)).toBe(2);
		expect(predicate).toHaveBeenCalledWith(8, 2, values);
	});

	test("returns -1 when there is no match", () => {
		expect(findLastIndex([1, 3, 5], (value) => value > 10)).toBe(-1);
	});
});

describe("asArray", () => {
	test("wraps defined values and preserves undefined", () => {
		expect(asArray("value")).toEqual(["value"]);
		expect(asArray(undefined)).toBeUndefined();
	});
});

describe("uniqueBy", () => {
	test("keeps the first item for each computed key", () => {
		const items = [
			{ id: 1, name: "first" },
			{ id: 2, name: "other" },
			{ id: 1, name: "duplicate" },
		];

		expect(
			uniqueBy<{ id: number; name: string }, number>((item) => item.id)(items),
		).toEqual(items.slice(0, 2));
	});
});

describe("equals", () => {
	test("compares arrays by length and JSON representation", () => {
		expect(equals([{ value: 1 }], [{ value: 1 }])).toBe(true);
		expect(equals([1, 2], [2, 1])).toBe(false);
		expect(equals([1], [1, 2])).toBe(false);
	});
});

describe("groupBy", () => {
	test("groups items by key in first-seen key order", () => {
		expect(
			groupBy<string, string>(["ant", "bear", "ape"], (item) => item[0]),
		).toEqual([
			["a", ["ant", "ape"]],
			["b", ["bear"]],
		]);
	});
});
