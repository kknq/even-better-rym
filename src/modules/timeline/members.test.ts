import { describe, expect, test } from "vitest";

import { parseMembersFromText } from "./members";

describe("parseMembersFromText", () => {
	test("parses members listed without roles or years", () => {
		const parsed = parseMembersFromText("Matt, Leigh");

		expect(parsed.members).toHaveLength(2);
		expect(parsed.members.map((member) => member.name)).toEqual([
			"Matt",
			"Leigh",
		]);
		expect(parsed.members.every((member) => member.roles.length === 0)).toBe(
			true,
		);
		expect(parsed.members.every((member) => member.stints.length === 0)).toBe(
			true,
		);
	});

	test("continues parsing role and year metadata", () => {
		const parsed = parseMembersFromText(
			"Matt (vocals, 2015-present), Leigh (guitar, 2016-present)",
		);

		expect(parsed.members).toHaveLength(2);
		expect(parsed.members[0].roles).toEqual(["vocals"]);
		expect(parsed.members[0].stints).toEqual([
			{ start: 2015, end: Number.POSITIVE_INFINITY },
		]);
		expect(parsed.members[1].roles).toEqual(["guitar"]);
		expect(parsed.members[1].stints).toEqual([
			{ start: 2016, end: Number.POSITIVE_INFINITY },
		]);
	});
});
