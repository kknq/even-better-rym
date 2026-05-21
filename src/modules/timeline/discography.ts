import { findAdjacentInfoContent } from "./dom-helpers";
import type {
	Bounds,
	DiscoType,
	MarkersByType,
	TimelineMarkers,
} from "./types";

function extractYearFromSpan(span: Element | null): number | null {
	if (!span) return null;
	const year = Number.parseInt((span.textContent || "").trim(), 10);
	return Number.isFinite(year) ? year : null;
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
	return null;
}

// Collect years from sibling release nodes up to the next section header
function collectReleaseYears(
	startNode: Element | null,
	disbandedYear: number | null,
): number[] {
	const years: number[] = [];
	let node: Element | null = startNode;
	while (node && !node.classList.contains("disco_header_top")) {
		if (node.classList.contains("disco_release")) {
			const yearSpan = node.querySelector(
				".disco_year_ymd, .disco_year_ym, .disco_year_y",
			);
			const year = extractYearFromSpan(yearSpan);
			if (year !== null && (disbandedYear === null || year <= disbandedYear)) {
				years.push(year);
			}
		}
		node = node.nextElementSibling;
	}
	return years;
}

export function extractDiscographyMarkersFromDOM(
	disbandedYear: number | null,
): TimelineMarkers {
	const out: TimelineMarkers = { album: [], live: [], single: [], ep: [] };

	const discographyRoot = document.getElementById("discography");
	if (!discographyRoot) return out;

	const sectionHeaders = Array.from(
		discographyRoot.querySelectorAll<HTMLElement>(".disco_header_top"),
	);

	for (const header of sectionHeaders) {
		const labelEl = header.querySelector<HTMLElement>("h3.disco_header_label");
		const kind = normalizeDiscoLabel(labelEl?.textContent ?? "");
		if (!kind) continue;

		out[kind].push(
			...collectReleaseYears(header.nextElementSibling, disbandedYear),
		);
	}

	for (const k of Object.keys(out) as (keyof TimelineMarkers)[]) {
		out[k] = Array.from(new Set(out[k])).sort((a, b) => a - b);
	}

	return out;
}

export function toMarkersByType(src: TimelineMarkers): MarkersByType {
	return {
		album: src.album.map((year: number) => ({ year })),
		live: src.live.map((year: number) => ({ year })),
		single: src.single.map((year: number) => ({ year })),
		ep: src.ep.map((year: number) => ({ year })),
	};
}

// --------------------------
// Formed / Disbanded extraction
// --------------------------

function extractYear(text: string): number | null {
	const m = /\b(19|20)\d{2}\b/.exec(String(text || ""));
	return m ? Number.parseInt(m[0], 10) : null;
}

function updateBoundsFromLabel(result: Bounds, label: string, d: Date): void {
	if (label === "formed") result.formedDate = d;
	if (label === "disbanded") result.disbandedDate = d;
	if (
		!result.disbandedDate &&
		(label.includes("disband") || label.includes("split"))
	) {
		result.disbandedDate = d;
	}
	if (!result.formedDate && label.includes("form")) {
		result.formedDate = d;
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

	for (const h of infoHeaders) {
		const label = (h.textContent || "").trim().toLowerCase();
		if (!label) continue;

		const contentEl = findAdjacentInfoContent(h);
		if (!contentEl) continue;

		const year = extractYear(contentEl.textContent || "");
		if (year === null) continue;

		updateBoundsFromLabel(result, label, new Date(year, 0, 1));
	}

	return result;
}
