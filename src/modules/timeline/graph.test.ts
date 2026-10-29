// @vitest-environment jsdom

import { describe, expect, test } from "vitest";

import { buildGraph } from "./graph";
import type { Member } from "./types";

describe("buildGraph", () => {
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
	});
});
