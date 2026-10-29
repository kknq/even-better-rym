// @vitest-environment jsdom

import { render } from "preact";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import MapApp from "./app";
import { findOfflineLocation } from "./geocode";
import { mountMap } from "./main";

vi.mock("./app", () => ({ default: vi.fn(() => null) }));
vi.mock("./geocode", () => ({ findOfflineLocation: vi.fn() }));

let container: HTMLDivElement;

beforeEach(() => {
	vi.resetAllMocks();
	document.body.replaceChildren();
	container = document.createElement("div");
	document.body.appendChild(container);
	vi.mocked(findOfflineLocation).mockReturnValue(null);
});

afterEach(() => {
	render(null, container);
	document.body.replaceChildren();
});

function expectCities(
	cities: (string | { name: string; lat: number; lon: number })[],
) {
	expect(vi.mocked(MapApp).mock.calls.at(-1)?.[0].cities).toEqual(cities);
}

describe("mountMap", () => {
	test("uses explicit cities instead of extracting them from the document", () => {
		document.body.insertAdjacentHTML(
			"beforeend",
			'<span data-city="Ignored"/>',
		);
		const cities = [{ name: "Test City", lat: 10, lon: 20 }, "Other City"];
		mountMap(container, cities);
		expectCities(cities);
		expect(findOfflineLocation).not.toHaveBeenCalled();
	});

	test("preserves an explicitly empty city list", () => {
		document.body.insertAdjacentHTML(
			"beforeend",
			'<span data-city="Ignored"/>',
		);
		mountMap(container, []);
		expectCities([]);
	});

	test("prefers structured show lists and resolves location IDs first", () => {
		const point = { name: "Offline City", lat: 10, lon: 20 };
		vi.mocked(findOfflineLocation).mockReturnValue(point);
		document.body.insertAdjacentHTML(
			"beforeend",
			`<span data-city="Ignored"></span>
			<div class="section_artist_shows"><ul class="shows">
				<li data-loc-id="loc_1" data-city="Ignored"></li>
				<li id="show_loc_1"></li>
			</ul></div>`,
		);

		mountMap(container);

		expectCities([point]);
		expect(findOfflineLocation).toHaveBeenCalledWith("loc_1");
	});

	test.each([
		['<li data-city=" Test City ">Ignored</li>', "Test City"],
		['<li data-location=" Other City ">Ignored</li>', "Other City"],
		['<li><span style="font-size:12px">Styled City</span></li>', "Styled City"],
		[
			'<li><span class="show_venue"><a>Venue</a> Venue City</span></li>',
			"Venue City",
		],
		['<li><span class="show_venue">Plain City</span></li>', "Plain City"],
		["<li><a>Band</a> @ After Link City</li>", "After Link City"],
		["<li>Venue, City, Country</li>", "City, Country"],
		["<li>Text City</li>", "Text City"],
	])("extracts a city from show markup: %s", (markup, city) => {
		document.body.insertAdjacentHTML(
			"beforeend",
			`<div class="section_artist_shows"><ul class="shows">${markup}</ul></div>`,
		);
		mountMap(container);
		expectCities([city]);
	});

	test("falls back to generic city elements, skipping blanks and duplicates", () => {
		document.body.insertAdjacentHTML(
			"beforeend",
			`<span data-city=" Test City "></span>
			<span data-location="Other City"></span>
			<span class="rymmt-show">Test City</span>
			<span class="rymmt-show"></span>`,
		);
		mountMap(container);
		expectCities(["Test City", "Other City"]);
	});

	test("falls back to city text when a location ID is unknown", () => {
		document.body.insertAdjacentHTML(
			"beforeend",
			'<span id="loc_999" data-city="Fallback City"></span>',
		);
		mountMap(container);
		expectCities(["Fallback City"]);
		expect(findOfflineLocation).toHaveBeenCalledWith("loc_999");
	});

	test("renders an empty map when no cities are available", () => {
		mountMap(container);
		expectCities([]);
	});
});
