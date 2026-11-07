import { DiscographyRateLimitError } from "~/shared/artist-discography";
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

	const disco = await extractDiscographyMarkersFromDOM(disbandedYear);
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

async function loadPanel(
	panel: HTMLElement,
	header: HTMLElement | null,
): Promise<void> {
	if (panel.getAttribute("aria-busy") === "true") return;
	panel.setAttribute("aria-busy", "true");
	panel.textContent = "Loading timeline...";
	try {
		await openPastShows(3000);
		await renderIntoPanel(panel, header);
	} catch (error) {
		console.error("[timeline] Could not load complete timeline:", error);
		panel.textContent =
			error instanceof DiscographyRateLimitError
				? `${error.message} `
				: "Could not load the complete timeline. ";
		const retry = document.createElement("button");
		retry.type = "button";
		retry.textContent = "Retry";
		if (error instanceof DiscographyRateLimitError) {
			retry.disabled = Date.now() < error.retryAt;
			setTimeout(
				() => {
					retry.disabled = false;
				},
				Math.max(0, error.retryAt - Date.now()),
			);
		}
		retry.addEventListener("click", () => {
			void loadPanel(panel, header);
		});
		panel.append(retry);
	} finally {
		panel.setAttribute("aria-busy", "false");
	}
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
			void loadPanel(panel, headerEl);
		} else {
			panel.classList.add("rymmt-hidden");
		}
	} catch (e) {
		console.error("[timeline] togglePanel error:", e);
	}
}
