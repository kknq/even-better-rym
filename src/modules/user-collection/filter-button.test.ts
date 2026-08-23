import { describe, expect, test } from "vitest";

import { splitCollectionModifiers } from "./filter-button";

describe("splitCollectionModifiers", () => {
	test("splits comma-separated modifiers", () => {
		expect(splitCollectionModifiers("a,b,c")).toEqual(["a", "b", "c"]);
	});

	test("splits modifiers separated with percent-encoded commas", () => {
		expect(splitCollectionModifiers("a%2cb%2cc")).toEqual(["a", "b", "c"]);
	});
});
