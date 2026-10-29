// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getOfflineLocationById, getOfflineLocationByName } from "./geocode";
import { applySmallMapCoords, clearSmallMapOverlay } from "./overlay";

vi.mock("./geocode", () => ({
	getOfflineLocationById: vi.fn(),
	getOfflineLocationByName: vi.fn(),
	latLonToSmallMapCoords: (lat: number, lon: number) => ({
		cx: lon * 2,
		cy: -lat * 3,
	}),
}));

beforeEach(() => {
	vi.resetAllMocks();
	document.body.replaceChildren();
	vi.mocked(getOfflineLocationById).mockReturnValue(null);
	vi.mocked(getOfflineLocationByName).mockReturnValue(null);
});

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe("applySmallMapCoords", () => {
	test("sets coordinates and marks SVG locations with known IDs", () => {
		document.body.innerHTML = '<svg><circle id="loc_1"/></svg>';
		vi.mocked(getOfflineLocationById).mockReturnValue({
			name: "Test City",
			lat: 10,
			lon: 20,
		});

		applySmallMapCoords();

		const circle = document.getElementById("loc_1");
		expect(circle?.getAttribute("cx")).toBe("40");
		expect(circle?.getAttribute("cy")).toBe("-30");
		expect(circle?.classList.contains("rymmt-small-map-applied")).toBe(true);
	});

	test("leaves unknown locations and unrelated SVGs unchanged", () => {
		document.body.innerHTML =
			'<svg><circle id="decoration" cx="9"/></svg><svg><circle id="loc_999" cx="1" cy="2"/></svg>';

		applySmallMapCoords();

		expect(document.getElementById("loc_999")?.getAttribute("cx")).toBe("1");
		expect(document.getElementById("loc_999")?.getAttribute("cy")).toBe("2");
		expect(document.querySelector(".rymmt-small-map-applied")).toBeNull();
	});

	test.each([
		'<circle id="test city" cx="0"/>',
		'<circle data-name="Test City" cx="0"/>',
	])("matches city text to SVG IDs or data-name attributes: %s", (circle) => {
		document.body.innerHTML = `<span class="show_venue">Test City</span><svg>${circle}</svg>`;
		vi.mocked(getOfflineLocationByName).mockReturnValue({
			name: "Test City",
			lat: -10,
			lon: -20,
		});

		applySmallMapCoords();

		const marker = document.querySelector("circle");
		expect(marker?.getAttribute("cx")).toBe("-40");
		expect(marker?.getAttribute("cy")).toBe("30");
		expect(marker?.classList.contains("rymmt-small-map-applied")).toBe(true);
	});

	test("does not mark SVG elements whose names do not match city text", () => {
		document.body.innerHTML =
			'<span>Test City</span><svg><circle data-name="Other City" cx="7"/></svg>';
		vi.mocked(getOfflineLocationByName).mockReturnValue({
			name: "Test City",
			lat: 10,
			lon: 20,
		});

		applySmallMapCoords();

		expect(document.querySelector("circle")?.getAttribute("cx")).toBe("7");
		expect(document.querySelector(".rymmt-small-map-applied")).toBeNull();
	});

	test("handles pages without maps or city text", () => {
		document.body.innerHTML = "<span>   </span>";
		expect(() => applySmallMapCoords()).not.toThrow();
		expect(getOfflineLocationByName).not.toHaveBeenCalled();
	});

	test("limits city-name lookups to the first 500 text candidates", () => {
		document.body.innerHTML = "<span>Unknown City</span>".repeat(501);
		applySmallMapCoords();
		expect(getOfflineLocationByName).toHaveBeenCalledTimes(500);
	});

	test("reports DOM failures rather than throwing", () => {
		const error = new DOMException("invalid selector");
		vi.spyOn(document, "querySelectorAll").mockImplementationOnce(() => {
			throw error;
		});
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

		expect(() => applySmallMapCoords()).not.toThrow();
		expect(warn).toHaveBeenCalledWith(
			"[map][overlay] DOM error during apply",
			error.message,
		);
	});
});

describe("clearSmallMapOverlay", () => {
	test("removes applied coordinates without changing unrelated markers", () => {
		document.body.innerHTML = `
			<svg>
				<circle class="rymmt-small-map-applied other-class" cx="1" cy="2"/>
				<circle id="untouched" cx="3" cy="4"/>
			</svg>
			<span class="rymmt-small-map-applied">Test City</span>`;

		clearSmallMapOverlay();

		const circle = document.querySelector("circle");
		expect(circle?.hasAttribute("cx")).toBe(false);
		expect(circle?.hasAttribute("cy")).toBe(false);
		expect(circle?.classList.contains("other-class")).toBe(true);
		expect(document.querySelector(".rymmt-small-map-applied")).toBeNull();
		expect(document.getElementById("untouched")?.getAttribute("cx")).toBe("3");
	});

	test("can safely run repeatedly on an empty page", () => {
		expect(() => {
			clearSmallMapOverlay();
			clearSmallMapOverlay();
		}).not.toThrow();
	});
});
