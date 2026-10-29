import { describe, expect, test } from "vitest";

import filenamify from "./filenamify";

describe("filenamify", () => {
	test("replaces reserved filename characters and normalizes accents", () => {
		expect(filenamify("Café: album?.mp3")).toBe("Cafe\u0301! album!.mp3");
	});

	test("protects relative paths and Windows device names", () => {
		expect(filenamify("../CON")).toBe("!CON");
		expect(filenamify("NUL")).toBe("NUL!");
	});

	test("supports a custom replacement and maximum filename length", () => {
		expect(filenamify("a/b", { replacement: "_" })).toBe("a_b");
		expect(filenamify("longfilename.txt", { maxLength: 7 })).toBe("lon.txt");
	});

	test("rejects a replacement containing reserved and control characters", () => {
		expect(() => filenamify("name", { replacement: "/\u0001" })).toThrow(
			"Replacement string cannot contain reserved filename characters",
		);
	});
});
