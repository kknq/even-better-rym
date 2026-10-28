import { describe, expect, test } from "vitest";

import { arrayToArtists, regexIndexOf, regexLastIndexOf } from "./string";

describe("regexIndexOf", () => {
	test("finds a match at or after the requested position", () => {
		expect(regexIndexOf("one two one", /one/, 2)).toBe(8);
		expect(regexIndexOf("one two", /two/, -2)).toBe(4);
	});

	test("returns -1 when there is no match", () => {
		expect(regexIndexOf("one", /two/)).toBe(-1);
	});
});

describe("regexLastIndexOf", () => {
	test("finds the last match while honoring the start position", () => {
		expect(regexLastIndexOf("a1b2c3", /\d/)).toBe(5);
		expect(regexLastIndexOf("a1b2c3", /\d/, 3)).toBe(3);
		expect(regexLastIndexOf("a1b2c3", /\d/, -1)).toBe(-1);
	});

	test("preserves case-insensitive matching for non-global expressions", () => {
		expect(regexLastIndexOf("A a", /a/i)).toBe(2);
	});
});

describe("arrayToArtists", () => {
	test("joins one, two, and multiple artists grammatically", () => {
		expect(arrayToArtists(["Artist"])).toBe("Artist");
		expect(arrayToArtists(["Artist A", "Artist B"])).toBe(
			"Artist A & Artist B",
		);
		expect(arrayToArtists(["A", "B", "C"])).toBe("A, B & C");
	});
});
