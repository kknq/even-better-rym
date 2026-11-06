import { describe, expect, test } from "vitest";

import { estimateMemberStints, parseMembersFromText } from "./members";
import { sanitizeRoles } from "./utils";

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

	test("keeps unknown endpoints out of roles without resolving them to present", () => {
		const parsed = parseMembersFromText(
			"A (bass, ?-2021), B (drums, 2017-?), C (violin, ?-present)",
		);
		expect(parsed.members.map((member) => member.roles)).toEqual([
			["bass"],
			["drums"],
			["violin"],
		]);
		expect(parsed.members.map((member) => member.stints)).toEqual([
			[{ start: Number.NaN, end: 2021 }],
			[{ start: 2017, end: Number.NaN }],
			[{ start: Number.NaN, end: Number.POSITIVE_INFINITY }],
		]);
		expect(parsed.maxYearMentioned).toBe(2021);
		expect(sanitizeRoles(["bass", "?–2021", "?-present", "2017-?"])).toEqual([
			"bass",
		]);
	});

	test("deduplicates repeated unknown stints", () => {
		const parsed = parseMembersFromText("A (bass, ?-2021), A (bass, ?-2021)");
		expect(parsed.members[0].stints).toHaveLength(1);
	});
});

describe("estimateMemberStints", () => {
	test("estimates the dated bass handoff in the Деревянные киты example", () => {
		const parsed = parseMembersFromText(
			"Artyom (bass, ?-2021), Sergey (bass), Ekaterina (drums), Aleksey (drums)",
		);
		const estimated = estimateMemberStints(parsed.members, 2015, 2026);
		expect(estimated[0].stints[0]).toMatchObject({ start: 2015, end: 2021 });
		expect(estimated[0].stints[0].startEstimate).toContain("Start unknown");
		expect(estimated[1].stints[0].start).toBe(2021);
		expect(estimated[1].stints[0].startEstimate).toContain(
			"same-role departure",
		);
		expect(estimated[2].stints[0].startEstimate).toBeUndefined();
		expect(parsed.members[0].stints[0].start).toBeNaN();
		expect(parsed.members[1].stints).toEqual([]);
	});

	test("leaves Frail Body's undated drum handoff as a window", () => {
		const parsed = parseMembersFromText(
			"Lowell (guitar, vocals), Nic (bass), Sam (drums, vocals, 2017-?), Nicholas (drums, ?-present)",
		);
		const estimated = estimateMemberStints(parsed.members, 2017.02, 2026);
		expect(estimated[2].stints[0]).toMatchObject({ start: 2017, end: 2026 });
		expect(estimated[2].stints[0].endEstimate).toContain(
			"Not confirmed present",
		);
		expect(estimated[3].stints[0]).toMatchObject({
			start: 2017.02,
			end: Number.POSITIVE_INFINITY,
		});
		expect(estimated[3].stints[0].startEstimate).toContain("Start unknown");
	});

	test("preserves separate Carissa's Wierd return stints", () => {
		const parsed = parseMembersFromText(
			"Sera (drums, 1995, 2003-11, ?-present), Robin (drums, bass, 1998-2000, 2011), Sarah (violin, 1998-2011, ?-present), Ben (drums, bass, vocals, 2000-03)",
		);
		const estimated = estimateMemberStints(parsed.members, 1995, 2026);
		expect(estimated[0].stints).toHaveLength(3);
		expect(estimated[0].stints[2].start).toBe(2011);
		expect(estimated[0].stints[2].startEstimate).toContain("estimated");
		expect(estimated[2].stints).toHaveLength(2);
		expect(estimated[2].stints[1].start).toBe(2011);
		expect(estimated[2].stints[1].startEstimate).toContain("Start unknown");
	});

	test("uses a unique canonical-role successor but not shared vocals", () => {
		const parsed = parseMembersFromText(
			"A (drums, 2000-?), B (drum, 2005-present), C (vocals, 2000-?), D (vocals, 2003-present)",
		);
		const estimated = estimateMemberStints(parsed.members, 2000, 2020);
		expect(estimated[0].stints[0].end).toBe(2005);
		expect(estimated[0].stints[0].endEstimate).toContain("same-role arrival");
		expect(estimated[2].stints[0].end).toBe(2020);
		expect(estimated[2].stints[0].endEstimate).toContain("End unknown");
	});

	test("does not select among competing candidates or cascade estimates", () => {
		const parsed = parseMembersFromText(
			"A (bass, ?-2010), B (bass, 1990-2000), C (bass, 1995-2005), D (bass, ?-present)",
		);
		const estimated = estimateMemberStints(parsed.members, 1980, 2020);
		expect(estimated[0].stints[0].start).toBe(1980);
		expect(estimated[0].stints[0].startEstimate).toContain("Start unknown");
		expect(estimated[3].stints[0].start).toBe(1980);
		expect(estimated[3].stints[0].startEstimate).toContain("Start unknown");
		expect(
			estimateMemberStints([...parsed.members].reverse(), 1980, 2020).reverse(),
		).toEqual(estimated);
	});

	test("bounds an unknown end by the member's next dated stint", () => {
		const parsed = parseMembersFromText("A (bass, 2000-?, 2010-present)");
		const estimated = estimateMemberStints(parsed.members, 1990, 2020);
		expect(estimated[0].stints[0].end).toBe(2010);
		expect(estimated[0].stints[0].endEstimate).toContain("End unknown");
	});
});
