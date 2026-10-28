import {
	currentDecimalYear,
	parseDecimalYearFromDateString,
} from "./date-utils";
import type { DiscoMarker } from "./types";

function normalizeShowTitle(text: string): string {
	return text
		.replace(/[\u2013\u2014–—]+/g, " - ")
		.replace(/^[\s:\-–—]+/, "")
		.replace(/\s+/g, " ")
		.trim();
}

function stripShowDateFromText(item: HTMLElement): string {
	const dateSpan = getShowDateSpan(item);
	const dateText = dateSpan?.textContent?.trim() ?? "";
	const rawText = item.textContent?.replace(/\s+/g, " ").trim() ?? "";

	if (!rawText) return "";
	if (!dateText) return rawText;

	return rawText
		.replace(dateText, "")
		.replace(/^[\s:\-–—]+/, "")
		.trim();
}

function getShowDateSpan(item: HTMLElement): HTMLElement | null {
	const spans = Array.from(item.querySelectorAll<HTMLElement>("span"));

	for (const span of spans) {
		const style = span.getAttribute("style") ?? "";

		if (style.includes("width") && style.includes("10em")) {
			return span;
		}
	}

	for (const span of spans) {
		const text = span.textContent?.trim() ?? "";

		if (/\b(19|20)\d{2}\b/.test(text)) {
			return span;
		}
	}

	return spans[0] ?? null;
}

function extractShowTitleFromListItem(item: HTMLElement): string | null {
	const rawText = stripShowDateFromText(item);

	if (!rawText) return null;

	const normalized = normalizeShowTitle(rawText);
	const atMatch = /^(.*?)(?:\s+@\s+|\s+at\s+)(.*)$/i.exec(normalized);

	if (atMatch) {
		return `${normalizeShowTitle(atMatch[1])} @ ${normalizeShowTitle(atMatch[2])}`;
	}

	return normalized;
}

function extractShowDateFromListItem(item: HTMLElement): number | null {
	const dateSpan = getShowDateSpan(item);
	const dateText = dateSpan?.textContent?.trim();

	if (!dateText) return null;

	return parseDecimalYearFromDateString(dateText);
}

function hasRenderedPastShows(container: HTMLElement): boolean {
	const now = currentDecimalYear();
	return Array.from(container.querySelectorAll<HTMLElement>("li")).some(
		(item) => {
			const date = extractShowDateFromListItem(item);
			return date !== null && date <= now;
		},
	);
}

function loadPastShows(
	showsContainer: HTMLElement,
	expandButton: HTMLElement,
	timeoutMs: number,
): Promise<void> {
	return new Promise((resolve) => {
		const finish = () => {
			observer.disconnect();
			clearTimeout(timer);
			resolve();
		};
		const check = () => {
			if (
				!expandButton.isConnected ||
				expandButton.offsetParent === null ||
				hasRenderedPastShows(showsContainer)
			) {
				finish();
			}
		};
		const observer = new MutationObserver(check);
		const timer = setTimeout(() => {
			console.warn("[timeline] Timed out waiting for past shows to load");
			finish();
		}, timeoutMs);

		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
		});
		expandButton.click();
		check();
	});
}

export async function openPastShows(timeoutMs = 3000): Promise<void> {
	const showsContainer = document.querySelector<HTMLElement>(
		".section_artist_shows ul.shows",
	);
	const expandButton = document.getElementById("disco_expand_prev");
	if (
		!showsContainer ||
		hasRenderedPastShows(showsContainer) ||
		!expandButton?.offsetParent
	) {
		return;
	}
	await loadPastShows(showsContainer, expandButton, timeoutMs);
}

export async function extractShowMarkersFromDOM(
	disbandedYear: number | null,
): Promise<DiscoMarker[]> {
	await openPastShows();

	const showsSection = document.querySelector<HTMLElement>(
		".section_artist_shows ul.shows",
	);

	if (!showsSection) return [];

	const markers: DiscoMarker[] = [];
	const seen = new Set<string>();

	for (const item of Array.from(
		showsSection.querySelectorAll<HTMLElement>("li"),
	)) {
		const decimalYear = extractShowDateFromListItem(item);

		if (decimalYear === null) continue;
		if (disbandedYear !== null && Math.floor(decimalYear) > disbandedYear) {
			continue;
		}

		const title = extractShowTitleFromListItem(item);

		if (!title) continue;

		const identifier = `${decimalYear.toFixed(5)}|${title}`;

		if (seen.has(identifier)) continue;

		seen.add(identifier);
		markers.push({ year: decimalYear, title, type: "show" });
	}

	return markers;
}
