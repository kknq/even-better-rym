// @vitest-environment jsdom

import { describe, expect, test } from "vitest";

import { buildGraph } from "./graph";
import { parseMembersFromText } from "./members";
import type { Member } from "./types";

describe("buildGraph", () => {
	test("explains estimated dates in the legend rather than bar tooltips", () => {
		const container = document.createElement("div");
		const parsed = parseMembersFromText(
			"Sam (drums, 2017-?), Nicholas (drums, ?-present)",
		);
		buildGraph(container, parsed.members, { formedYear: 2017, endYear: 2026 });
		const bars = [...container.querySelectorAll<HTMLElement>(".rymmt-bar")];
		expect(bars).toHaveLength(2);
		expect(
			bars.every((bar) => bar.classList.contains("rymmt-bar-estimated")),
		).toBe(true);
		expect(bars[0].title).toBe("Sam (drums, 2017-?)");
		expect(bars[1].title).toBe("Nicholas (drums, ?-present)");
		expect(
			container.querySelector(".rymmt-legend-section .rymmt-estimate-note")
				?.textContent,
		).toBe(
			"Faded, dashed bars indicate estimated or unknown membership dates.",
		);
		expect(bars.every((bar) => bar.style.left === "0%")).toBe(true);
		expect(bars.every((bar) => bar.style.width === "100%")).toBe(true);
		expect(container.querySelectorAll(".rymmt-stripe")).toHaveLength(2);
	});

	test("keeps returning stints visible and marks only the uncertain stint", () => {
		const container = document.createElement("div");
		const parsed = parseMembersFromText("Sarah (violin, 1998-2011, ?-present)");
		buildGraph(container, parsed.members, { formedYear: 1995, endYear: 2026 });
		expect(container.querySelectorAll(".rymmt-bar")).toHaveLength(2);
		expect(container.querySelectorAll(".rymmt-bar-estimated")).toHaveLength(1);
	});

	test("assigns distinct colors to members without roles", () => {
		const container = document.createElement("div");
		const members: Member[] = [
			{
				name: "Matt",
				roles: [],
				stints: [],
				raw: "Matt",
			},
			{
				name: "Leigh",
				roles: [],
				stints: [],
				raw: "Leigh",
			},
		];

		buildGraph(container, members, { endYear: 2020 });

		const stripes = [
			...container.querySelectorAll<HTMLElement>(".rymmt-stripe"),
		];
		expect(stripes).toHaveLength(2);
		expect(stripes[0].style.background).not.toBe("");
		expect(stripes[0].style.background).not.toBe(stripes[1].style.background);
		expect(container.querySelector(".rymmt-estimate-note")).toBeNull();
	});

	test("omits the estimate note when all stints have known dates", () => {
		const container = document.createElement("div");
		const parsed = parseMembersFromText("Sam (drums, 2017-present)");
		buildGraph(container, parsed.members, { formedYear: 2017, endYear: 2026 });
		expect(container.querySelector(".rymmt-estimate-note")).toBeNull();
	});
});
