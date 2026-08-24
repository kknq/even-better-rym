import { isDarkPage } from "~/shared/utils/theme";
import mountMap from "../map/main";
import { applySmallMapCoords, clearSmallMapOverlay } from "../map/overlay";
import { findAdjacentInfoContent } from "./dom-helpers";
import { openPastShows } from "./show";

const LINK_CLASS = "rymmt-link";

function insertMapInShowsSection(
	root: HTMLElement,
	showsHeaderEl: HTMLElement,
): void {
	// Try to find the .section_artist_shows ancestor and insert before ul.shows
	const section = showsHeaderEl.closest<HTMLElement>(".section_artist_shows");
	if (section) {
		const showsList = section.querySelector<HTMLElement>("ul.shows");
		if (showsList) {
			showsList.before(root);
		} else {
			section.appendChild(root);
		}
		return;
	}
	// Try adjacent info_content block (standard info_hdr pattern)
	const infoContent = findAdjacentInfoContent(showsHeaderEl);
	if (infoContent) {
		infoContent.prepend(root);
		return;
	}
	// Last resort: insert after the header element
	showsHeaderEl.after(root);
}

export function addMapLink(showsHeaderEl: HTMLElement): void {
	if (
		showsHeaderEl.parentElement?.querySelector(`.${LINK_CLASS}.rymmt-map-link`)
	) {
		return;
	}

	const mapLink = document.createElement("span");
	mapLink.className = `${LINK_CLASS} rymmt-map-link`;
	mapLink.textContent = "[Map]";

	if (isDarkPage(showsHeaderEl)) {
		mapLink.style.color = "#7eb8f7";
	}

	let loading = false;
	const handleMapClick = async () => {
		if (loading) return;

		const existing = document.getElementById("rymmt-map-root");

		if (existing) {
			existing.remove();
			clearSmallMapOverlay();
			return;
		}

		loading = true;
		mapLink.textContent = "[Building map...]";
		mapLink.style.cursor = "wait";
		mapLink.style.pointerEvents = "none";

		try {
			await openPastShows(3000);

			const root = document.createElement("div");
			root.id = "rymmt-map-root";
			root.style.marginBottom = "10px";

			insertMapInShowsSection(root, showsHeaderEl);

			mountMap(root);
			applySmallMapCoords();
		} finally {
			loading = false;
			mapLink.textContent = "[Map]";
			mapLink.style.cursor = "";
			mapLink.style.pointerEvents = "";
		}
	};

	mapLink.addEventListener("click", () => {
		handleMapClick().catch((error: unknown) => {
			console.error("[map] mount error", error);
		});
	});

	showsHeaderEl.appendChild(mapLink);
}
