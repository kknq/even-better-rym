import { currentDecimalYear, decimalYearOf } from "./date-utils";
import {
	extractDiscographyMarkersFromDOM,
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

function renderIntoPanel(
	panelEl: HTMLElement,
	headerEl: HTMLElement | null,
): void {
	const membersContent = headerEl ? findAdjacentInfoContent(headerEl) : null;
	const renderedSpan = membersContent?.querySelector("span.rendered_text");
	const membersText = (renderedSpan ?? membersContent)?.textContent ?? "";
	const parsed = parseMembersFromText(membersText ?? "");

	const bounds = readFormedAndDisbanded(document);
	const formedYear = decimalYearOf(bounds.formedDate);
	const disbandedYear = decimalYearOf(bounds.disbandedDate);

	const disco = extractDiscographyMarkersFromDOM(disbandedYear);

	const allReleaseYears = [
		...disco.album,
		...disco.live,
		...disco.single,
		...disco.ep,
		...disco.additional,
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
		markers: disco,
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
			renderIntoPanel(panel, headerEl);
		} else {
			panel.classList.add("rymmt-hidden");
		}
	} catch (e) {
		console.error("[timeline] togglePanel error:", e);
	}
}
