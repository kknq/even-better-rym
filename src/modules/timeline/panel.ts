import { currentDecimalYear, decimalYearOf } from "./date-utils";
import {
	extractDiscographyMarkersFromDOM,
	extractShowMarkersFromDOM,
	openPastShows,
	readFormedAndDisbanded,
} from "./discography";
import {
	findAdjacentInfoContent,
	insertPanelAfterLastRenderedTextArtist,
} from "./dom-helpers";
import { attachGraphInteractivity, buildGraph } from "./graph";
import { parseMembersFromText } from "./members";
import { applyRymThemeVars } from "./theme";

const PANEL_ID = "rymmt-panel";

function formatFullDate(date: Date): string {
	return date.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

async function renderIntoPanel(
	panelEl: HTMLElement,
	headerEl: HTMLElement | null,
): Promise<void> {
	const membersContent = headerEl ? findAdjacentInfoContent(headerEl) : null;
	const renderedSpan = membersContent?.querySelector("span.rendered_text");
	const membersText = (renderedSpan ?? membersContent)?.textContent ?? "";
	const parsed = parseMembersFromText(
		membersText ?? "",
		(renderedSpan ?? membersContent) as HTMLElement | null,
	);

	const bounds = readFormedAndDisbanded(document);
	const formedYear = decimalYearOf(bounds.formedDate);
	const disbandedYear = decimalYearOf(bounds.disbandedDate);

	const axisStartLabel = bounds.formedDate
		? formatFullDate(bounds.formedDate)
		: (bounds.formedLabel ?? "First Release");
	const axisEndLabel = bounds.disbandedDate
		? formatFullDate(bounds.disbandedDate)
		: (bounds.disbandedLabel ?? "Now");

	const disco = extractDiscographyMarkersFromDOM(disbandedYear);
	const showMarkers = await extractShowMarkersFromDOM(disbandedYear);
	const markers = { ...disco, show: showMarkers };

	const allReleaseYears = [
		...disco.album,
		...disco.live,
		...disco.single,
		...disco.ep,
		...disco.additional,
		...showMarkers,
	].map((m) => m.year);

	const latestAnyRelease = allReleaseYears.length
		? Math.max(...allReleaseYears)
		: -Infinity;

	const mentionedYear =
		typeof parsed.maxYearMentioned === "number" &&
		Number.isFinite(parsed.maxYearMentioned)
			? parsed.maxYearMentioned
			: -Infinity;

	const latestReleaseOrNone = Number.isFinite(latestAnyRelease)
		? latestAnyRelease
		: -Infinity;
	const nowDecimal = currentDecimalYear();

	const endYear = Number.isFinite(disbandedYear)
		? disbandedYear
		: Math.max(latestReleaseOrNone, mentionedYear, nowDecimal);

	panelEl.innerHTML = "";
	buildGraph(panelEl, parsed.members, {
		formedYear,
		endYear,
		disbandedYear,
		axisStartLabel,
		axisEndLabel,
		markers,
	});
	attachGraphInteractivity(panelEl);
}

export function togglePanel(headerEl: HTMLElement | null): void {
	try {
		let panel = document.getElementById(PANEL_ID);

		if (!panel) {
			panel = document.createElement("div");
			panel.id = PANEL_ID;
			panel.className = "rymmt-panel rymmt-hidden";
		}

		if (!document.body.contains(panel)) {
			const inserted = insertPanelAfterLastRenderedTextArtist(panel, headerEl);
			if (!inserted) {
				(document.querySelector("#content") ?? document.body).appendChild(
					panel,
				);
			}
		}

		const isHidden = panel.classList.contains("rymmt-hidden");
		if (isHidden) {
			panel.classList.remove("rymmt-hidden");
			applyRymThemeVars(panel, headerEl);
			// Ensure past shows are opened and loaded before extracting
			void (async () => {
				await openPastShows(3000);
				void renderIntoPanel(panel, headerEl);
			})();
		} else {
			panel.classList.add("rymmt-hidden");
		}
	} catch (e) {
		console.error("[timeline] togglePanel error:", e);
	}
}
