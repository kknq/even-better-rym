import {
	currentDecimalYear,
	getDayOfYear,
	isLeapYear,
	MONTH_NAMES,
	parseDateLabelFromText,
	parseDecimalYearFromDateString,
	parseFullDateFromText,
} from "./date-utils";
import { findAdjacentInfoContent } from "./dom-helpers";
import type { Bounds, DiscoMarker, DiscoType, MarkersByType } from "./types";

function extractDecimalYearFromSpan(span: Element | null): number | null {
	if (!span) return null;

	// Try full date string in title
	const title = span.getAttribute("title") ?? "";
	const fullMatch = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(title);
	if (fullMatch) {
		const day = Number.parseInt(fullMatch[1], 10);
		const month = MONTH_NAMES[fullMatch[2].toLowerCase()];
		const year = Number.parseInt(fullMatch[3], 10);
		if (month && Number.isFinite(year) && day >= 1 && day <= 31) {
			const doy = getDayOfYear(year, month, day);
			const daysInYear = isLeapYear(year) ? 366 : 365;
			return year + (doy - 1) / daysInYear;
		}
	}

	// Fall back to year from text content - place at mid-year
	const year = Number.parseInt((span.textContent ?? "").trim(), 10);
	return Number.isFinite(year) ? year + 0.5 : null;
}

function normalizeDiscoLabel(
	label: string | null | undefined,
): DiscoType | null {
	const type = String(label ?? "")
		.trim()
		.toLowerCase();
	if (type === "album" || type === "albums") return "album";
	if (type === "live album" || type === "live albums") return "live";
	if (type === "single" || type === "singles") return "single";
	if (type === "ep" || type === "eps") return "ep";
	if (
		type === "additional release" ||
		type === "additional releases" ||
		type === "additional"
	)
		return "additional";
	return null;
}

// Collect release markers (decimal year + title) from within a disco_type_* container
function collectReleases(
	container: Element | null,
	discoType: DiscoType,
	disbandedYear: number | null,
): DiscoMarker[] {
	if (!container) return [];
	const markers: DiscoMarker[] = [];
	const releases = container.querySelectorAll<Element>(".disco_release");
	for (const release of releases) {
		const yearSpan = release.querySelector(
			".disco_year_ymd, .disco_year_ym, .disco_year_y",
		);
		const decimalYear = extractDecimalYearFromSpan(yearSpan);
		if (decimalYear === null) continue;
		// disbandedYear is an integer; compare against the floor of the decimal year
		if (disbandedYear !== null && Math.floor(decimalYear) > disbandedYear)
			continue;

		const titleEl = release.querySelector<HTMLElement>(".disco_mainline a");
		const title =
			titleEl?.textContent?.trim() ?? String(Math.floor(decimalYear));

		markers.push({ year: decimalYear, title, type: discoType });
	}
	return markers;
}

export function extractDiscographyMarkersFromDOM(
	disbandedYear: number | null,
): MarkersByType {
	const markers: MarkersByType = {
		album: [],
		live: [],
		single: [],
		ep: [],
		additional: [],
		show: [],
	};

	const discographyRoot = document.getElementById("discography");
	if (!discographyRoot) return markers;

	const sectionHeaders = Array.from(
		discographyRoot.querySelectorAll<HTMLElement>(".disco_header_top"),
	);

	for (const header of sectionHeaders) {
		const labelEl = header.querySelector<HTMLElement>("h3.disco_header_label");
		const kind = normalizeDiscoLabel(labelEl?.textContent ?? "");
		if (!kind) continue;

		// Releases live inside the disco_type_* container that follows the header
		let node: Element | null = header.nextElementSibling;
		while (node && !node.classList.contains("disco_header_top")) {
			if (node.id.startsWith("disco_type_")) {
				markers[kind].push(...collectReleases(node, kind, disbandedYear));
				break;
			}
			node = node.nextElementSibling;
		}
	}

	// Deduplicate by (integer year, title) within each type, preserving order
	for (const type of Object.keys(markers) as (keyof MarkersByType)[]) {
		const seen = new Set<string>();
		markers[type] = markers[type].filter((m) => {
			const identifier = `${Math.floor(m.year)}|${m.title}`;
			if (seen.has(identifier)) return false;
			seen.add(identifier);
			return true;
		});
	}

	return markers;
}

// --------------------------
// Formed / Disbanded extraction
// --------------------------

function updateBoundsFromLabel(
	result: Bounds,
	label: string,
	date: Date,
): void {
	if (label === "formed") result.formedDate = date;
	if (label === "disbanded") result.disbandedDate = date;
	if (
		!result.disbandedDate &&
		(label.includes("disband") || label.includes("split"))
	) {
		result.disbandedDate = date;
	}
	if (!result.formedDate && label.includes("form")) {
		result.formedDate = date;
	}
}

export function readFormedAndDisbanded(
	containerRoot: ParentNode | null,
): Bounds {
	const root = containerRoot ?? document;
	const infoHeaders = Array.from(
		root.querySelectorAll<HTMLElement>(".info_hdr"),
	);
	const result: Bounds = { formedDate: null, disbandedDate: null };

	for (const header of infoHeaders) {
		const label = (header.textContent || "").trim().toLowerCase();
		if (!label) continue;

		const contentEl = findAdjacentInfoContent(header);
		if (!contentEl) continue;

		const labelText = parseDateLabelFromText(contentEl.textContent || "");
		const date = parseFullDateFromText(contentEl.textContent || "");
		if (labelText) {
			if (label === "formed") result.formedLabel = labelText;
			if (label === "disbanded") result.disbandedLabel = labelText;
		}
		if (date) updateBoundsFromLabel(result, label, date);
	}

	return result;
}

export {
	extractShowMarkersFromDOM,
	openPastShows,
} from "./show";
