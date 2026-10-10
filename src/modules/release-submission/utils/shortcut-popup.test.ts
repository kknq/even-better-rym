import { describe, expect, test, vi } from "vitest";

vi.mock("~/shared/utils/dom", () => ({ forceQuerySelector: vi.fn() }));

import { parseArtistResultId } from "./shortcut-popup";

describe("parseArtistResultId", () => {
	test("reads the artist id from a result row's onclick", () => {
		expect(
			parseArtistResultId(
				"window.parent.createShortcut('a', '1639184');return false;",
			),
		).toBe("1639184");
	});

	test("ignores non-artist shortcuts", () => {
		expect(
			parseArtistResultId("window.parent.createShortcut('b', '42');"),
		).toBeUndefined();
	});

	test("ignores text with no shortcut call", () => {
		expect(parseArtistResultId("")).toBeUndefined();
		expect(parseArtistResultId("navArtist(5)")).toBeUndefined();
	});
});
