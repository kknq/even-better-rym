import { describe, expect, test } from "vitest";

import {
	buildChartRoleColorMap,
	canonicalRole,
	capitalizeWords,
} from "./roles";

describe("canonicalRole", () => {
	test("normalizes aliases and leaves unknown roles normalized", () => {
		expect(canonicalRole(" Lead Vocal ")).toBe("vocals");
		expect(canonicalRole("Synth")).toBe("synthesizer");
		expect(canonicalRole("  acoustic guitar  ")).toBe("acoustic guitar");
	});
});

describe("capitalizeWords", () => {
	test("capitalizes words and normalizes whitespace", () => {
		expect(capitalizeWords("lead   vocals")).toBe("Lead Vocals");
	});
});

describe("buildChartRoleColorMap", () => {
	test("uses canonical CSS colors before assigning an alias a fallback", () => {
		const colors = buildChartRoleColorMap(["lead guitar", "guitar"], false);

		expect(colors.get("guitar")).toBe("var(--rymmt-role-guitar)");
		expect(colors.get("lead guitar")).toMatch(/^hsl\(\d+ 65% 40%\)$/);
	});

	test("assigns unique fallback colors and theme-specific values", () => {
		const colors = buildChartRoleColorMap(["unknown one", "unknown two"], true);

		expect(colors.get("unknown one")).toMatch(/^hsl\(\d+ 70% 45%\)$/);
		expect(colors.get("unknown two")).toMatch(/^hsl\(\d+ 70% 45%\)$/);
		expect(colors.get("unknown one")).not.toBe(colors.get("unknown two"));
	});
});
