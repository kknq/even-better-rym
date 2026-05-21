import {
	extractDiscographyMarkersFromDOM,
	readFormedAndDisbanded,
	toMarkersByType,
} from "./discography";
import {
	findAdjacentInfoContent,
	insertPanelAfterLastRenderedTextArtist,
} from "./dom-helpers";
import { buildGraph } from "./graph";
import { parseMembersFromText } from "./members";
import { applyRymThemeVars } from "./theme";
import { yearOf } from "./utils";

const PANEL_ID = "rymmt-panel";

function renderIntoPanel(
	panelEl: HTMLElement,
	headerEl: HTMLElement | null,
): void {
	const membersContent = headerEl ? findAdjacentInfoContent(headerEl) : null;
	const membersText = membersContent ? membersContent.textContent : "";
	const parsed = parseMembersFromText(membersText ?? "");

	const bounds = readFormedAndDisbanded(document);
	const formedYear = yearOf(bounds.formedDate);
	const disbandedYear = yearOf(bounds.disbandedDate);

	const disco = extractDiscographyMarkersFromDOM(disbandedYear);

	const latestAnyRelease = Math.max(
		disco.album.at(-1) ?? -Infinity,
		disco.live.at(-1) ?? -Infinity,
		disco.single.at(-1) ?? -Infinity,
		disco.ep.at(-1) ?? -Infinity,
	);

	const mentionedYear =
		typeof parsed.maxYearMentioned === "number"
			? parsed.maxYearMentioned
			: -Infinity;

	const latestReleaseOrNone = Number.isFinite(latestAnyRelease)
		? latestAnyRelease
		: -Infinity;
	const endYear = Number.isFinite(disbandedYear)
		? disbandedYear
		: Math.max(latestReleaseOrNone, mentionedYear, new Date().getFullYear());

	panelEl.innerHTML = "";
	buildGraph(panelEl, parsed.members, {
		formedYear,
		endYear,
		disbandedYear,
		markers: toMarkersByType(disco),
	});
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
