// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { isDarkPage } from "~/shared/utils/theme";
import MapApp from "./app";
import { geocodeCity, getCachedCity } from "./geocode";
import type { CityPoint } from "./types";

vi.mock("~/shared/utils/theme", () => ({ isDarkPage: vi.fn() }));
vi.mock("./geocode", () => ({
	getCachedCity: vi.fn(),
	geocodeCity: vi.fn(),
	latLonToSmallMapCoords: (lat: number, lon: number) => ({
		cx: lon * 2,
		cy: -lat * 3,
	}),
}));
vi.mock("./map-svg", () => ({
	SMALL_MAP_SVG: `<svg xmlns="http://www.w3.org/2000/svg">
		<g transform="translate(250 166.5)" onclick="alert(1)">
			<g><circle class="rymmt-small-map-marker"/></g>
		</g>
	</svg>`,
}));

const point: CityPoint = { name: "Test City", lat: 10, lon: 20 };
let container: HTMLDivElement;

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(isDarkPage).mockReturnValue(false);
	vi.mocked(getCachedCity).mockResolvedValue(null);
	vi.mocked(geocodeCity).mockResolvedValue(null);
	// jsdom does not expose SVGAnimatedLength properties on circles.
	vi.spyOn(console, "warn").mockImplementation(() => undefined);
	container = document.createElement("div");
	document.body.appendChild(container);
});

afterEach(async () => {
	await act(() => render(null, container));
	container.remove();
	vi.restoreAllMocks();
});

async function showMap(cities?: (string | CityPoint)[]) {
	await act(() => {
		render(<MapApp cities={cities} />, container);
	});
}

function markers() {
	return container.querySelectorAll<SVGCircleElement>(
		".rymmt-small-map-marker",
	);
}

async function waitForReady() {
	await vi.waitFor(() => {
		expect(
			container.querySelector<HTMLElement>(".rymmt-map-loading-overlay")?.style
				.display,
		).toBe("none");
	});
}

describe("MapApp", () => {
	test("clears pre-rendered markers, strips click handlers, and fills the container", async () => {
		await showMap();

		expect(markers()).toHaveLength(0);
		expect(container.querySelector("[onclick]")).toBeNull();
		expect(
			container.querySelector("svg")?.getAttribute("preserveAspectRatio"),
		).toBe("none");
		expect(container.querySelector("svg")?.style.width).toBe("100%");
		expect(
			container.querySelector<HTMLElement>(".rymmt-map-loading-overlay")?.style
				.display,
		).toBe("none");
		expect(getCachedCity).not.toHaveBeenCalled();
	});

	test("renders supplied coordinates without storage or network lookup", async () => {
		await showMap([point]);
		await waitForReady();

		const marker = markers()[0];
		expect(markers()).toHaveLength(1);
		expect(marker.getAttribute("cx")).toBe("40");
		expect(marker.getAttribute("cy")).toBe("-30");
		expect(marker.getAttribute("r")).toBe("3");
		expect(marker.getAttribute("title")).toBe(point.name);
		expect(marker.dataset.city).toBe(point.name);
		expect(marker.dataset.index).toBe("0");
		expect(marker.style.getPropertyPriority("fill")).toBe("important");
		expect(marker.parentElement?.getAttribute("transform")).toBe(
			"translate(0,-5)",
		);
		expect(getCachedCity).not.toHaveBeenCalled();
		expect(geocodeCity).not.toHaveBeenCalled();
	});

	test("uses cached cities first and geocodes only cache misses, preserving order", async () => {
		const remote = { name: "Remote City", lat: -10, lon: -20 };
		vi.mocked(getCachedCity)
			.mockResolvedValueOnce(point)
			.mockResolvedValue(null);
		vi.mocked(geocodeCity).mockResolvedValue(remote);

		await showMap(["Cached City", "Remote City"]);
		await waitForReady();

		expect([...markers()].map((marker) => marker.dataset.city)).toEqual([
			point.name,
			remote.name,
		]);
		expect(geocodeCity).toHaveBeenCalledExactlyOnceWith("Remote City");
	});

	test("skips cities for which geocoding returns no location", async () => {
		await showMap(["Unknown City", point]);
		await waitForReady();
		expect(markers()).toHaveLength(1);
		expect(markers()[0].dataset.city).toBe(point.name);
	});

	test.each([
		false,
		true,
	])("shows a theme-aware overlay while loading (dark: %s)", async (dark) => {
		vi.mocked(isDarkPage).mockReturnValue(dark);
		let resolveCity!: (value: CityPoint | null) => void;
		vi.mocked(getCachedCity).mockReturnValue(
			new Promise((resolve) => {
				resolveCity = resolve;
			}),
		);

		await showMap(["Pending City"]);
		const overlay = container.querySelector<HTMLElement>(
			".rymmt-map-loading-overlay",
		);
		expect(overlay?.style.display).toBe("flex");
		expect(overlay?.style.background).toBe(
			dark ? "rgba(30, 30, 30, 0.75)" : "rgba(190, 190, 190, 0.65)",
		);

		await act(() => resolveCity(point));
		await waitForReady();
		expect(overlay?.style.display).toBe("none");
		expect(markers()).toHaveLength(1);
	});

	test("reports lookup failures, renders points already resolved, and hides the overlay", async () => {
		const error = new Error("storage unavailable");
		const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
		vi.mocked(getCachedCity).mockRejectedValue(error);

		await showMap([point, "Failed City"]);
		await waitForReady();

		expect(log).toHaveBeenCalledWith("Failed to render map markers:", error);
		expect(markers()).toHaveLength(1);
		expect(
			container.querySelector<HTMLElement>(".rymmt-map-loading-overlay")?.style
				.display,
		).toBe("none");
	});

	test("does not let an old pending lookup overwrite markers after cities change", async () => {
		let resolveCity!: (value: CityPoint | null) => void;
		vi.mocked(getCachedCity).mockReturnValue(
			new Promise((resolve) => {
				resolveCity = resolve;
			}),
		);
		await showMap(["Old City"]);
		const replacement = { name: "New City", lat: 30, lon: 40 };
		await showMap([replacement]);
		await waitForReady();
		await act(async () => {
			resolveCity(point);
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		expect(markers()).toHaveLength(1);
		expect(markers()[0].dataset.city).toBe("New City");
	});
});
