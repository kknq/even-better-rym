// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runScript } from "~/shared/utils/dom";
import { main } from "./app";

vi.mock("~/shared/utils/dom", () => ({
	runScript: vi.fn().mockResolvedValue(undefined),
	waitForElement: vi.fn((selector: string) =>
		Promise.resolve(document.querySelector<HTMLElement>(selector)),
	),
}));

beforeEach(() => {
	vi.clearAllMocks();
	document.body.innerHTML = ["controlbara", "controlbarb"]
		.map((id) => `<div id="${id}">${"<input type='button'>".repeat(12)}</div>`)
		.join("");
});

describe("image cropper controls", () => {
	it("shows the direction of edge movement in both control bars", async () => {
		await main();

		for (const bar of document.querySelectorAll("div")) {
			const buttons = [...bar.querySelectorAll("button")];
			const expected = [
				["left", "right", "\u2192", "trimLeft"],
				["right", "left", "\u2190", "trimRight"],
				["top", "down", "\u2193", "trimTop"],
				["bottom", "up", "\u2191", "trimBottom"],
			];
			const outward = [
				["left", "\u2190"],
				["right", "\u2192"],
				["up", "\u2191"],
				["down", "\u2193"],
			];

			expect(buttons).toHaveLength(16);
			for (const [edgeIndex, [edge, inward, arrow, fn]] of expected.entries()) {
				for (const [index, adjustment] of [50, 10, -10, -50].entries()) {
					const button = buttons[edgeIndex * 4 + index];
					const [movement, symbol] =
						adjustment > 0 ? [inward, arrow] : outward[edgeIndex];
					const label = adjustment > 0 ? `-${adjustment}` : `+${-adjustment}`;
					expect(button.textContent).toBe(`${symbol} ${label}`);
					expect(button.title).toBe(
						`Move ${edge} edge ${movement} by ${Math.abs(adjustment)} pixels`,
					);
					expect(button.getAttribute("aria-label")).toBe(button.title);
					button.click();
					expect(runScript).toHaveBeenLastCalledWith(`${fn}(${adjustment})`);
				}
			}
		}
	});

	it("does not duplicate controls when initialized again", async () => {
		await main();
		await main();

		expect(document.querySelectorAll("button")).toHaveLength(32);
	});
});
