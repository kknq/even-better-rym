import { h, render } from "preact";
import MapApp from "./app";
import { findOfflineLocation } from "./geocode";
import type { CityPoint } from "./types";

function resolveLocationId(
	item: HTMLElement,
	results: (string | CityPoint)[],
): boolean {
	const id = item.dataset.locId ?? /loc_\d+/i.exec(item.id)?.[0];
	if (!id) return false;
	const offline = findOfflineLocation(id);
	if (!offline) return false;
	results.push(offline);
	return true;
}

function extractCityFromShowListItem(item: HTMLElement): string {
	const dataCity = item.dataset.city ?? item.dataset.location;
	if (dataCity?.trim()) return dataCity.trim();

	const styledCity = item.querySelector<HTMLElement>(
		'span[style*="font-size"]',
	);
	if (styledCity?.textContent?.trim()) return styledCity.textContent.trim();

	const venueSpan = item.querySelector<HTMLElement>(".show_venue");
	if (venueSpan) {
		const anchor = venueSpan.querySelector<HTMLElement>("a");
		const txt = (venueSpan.textContent || "").trim();
		if (anchor?.textContent) {
			const city = txt.replace(anchor.textContent, "").trim();
			if (city) return city;
		}
		if (txt) return txt;
	}

	const anchors = item.querySelectorAll<HTMLElement>("a");
	if (anchors.length) {
		const lastAnchor = anchors[anchors.length - 1];
		const text = (item.textContent || "").replace(/\s+/g, " ").trim();
		const after = text
			.slice(
				text.lastIndexOf(lastAnchor.textContent || "") +
					(lastAnchor.textContent?.length ?? 0),
			)
			.trim();
		const cleaned = after.replace(/^[\s@,-]+/, "");
		if (cleaned) return cleaned;
	}

	const txt = (item.textContent || "").replace(/\s+/g, " ").trim();
	const parts = txt.split(",");
	if (parts.length >= 2) return parts.slice(-2).join(",").trim();
	return parts.at(-1)?.trim() ?? "";
}

// Try to auto-detect city list from page: look for .rymmt-show elements with data-city
function extractCitiesFromDocument(): (string | CityPoint)[] {
	const results: (string | CityPoint)[] = [];

	// Prefer structured show list items used on the artist page
	const items = document.querySelectorAll<HTMLElement>(
		".section_artist_shows ul.shows li",
	);
	if (items.length) {
		for (const item of Array.from(items)) {
			if (resolveLocationId(item, results)) continue;

			const city = extractCityFromShowListItem(item);
			if (city) results.push(city);
		}
		// dedupe preserving order
		return Array.from(new Set(results));
	}

	// fallback: generic elements with data-city/data-location or .rymmt-show markers
	const els = document.querySelectorAll<HTMLElement>(
		'.rymmt-show, [data-city], [data-location], [id^="loc_"]',
	);
	for (const el of Array.from(els)) {
		if (resolveLocationId(el, results)) continue;
		const city =
			(el.dataset.city ?? el.dataset.location ?? el.textContent) || "";
		if (city) results.push(city.trim());
	}
	return Array.from(new Set(results));
}

export function mountMap(
	container: HTMLElement,
	cities?: (string | CityPoint)[],
) {
	render(
		h(MapApp, { cities: cities ?? extractCitiesFromDocument() }),
		container,
	);
}

// If script is included directly on a page, auto-mount into #rymmt-map-root
if (typeof globalThis !== "undefined") {
	const root = document.getElementById("rymmt-map-root");
	if (root) mountMap(root);
}

export default mountMap;
