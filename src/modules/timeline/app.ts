import { waitForCallback } from "~/shared/utils/dom";
import { isDarkPage } from "~/shared/utils/theme";
import { addMapLink } from "./map-link";
import { togglePanel } from "./panel";

const LINK_CLASS = "rymmt-link";

export const main = async (): Promise<void> => {
	const membersHeaderEl = await waitForCallback<HTMLElement>(() => {
		const headers = document.querySelectorAll<HTMLElement>(".info_hdr");
		for (const header of headers) {
			if ((header.textContent || "").trim() === "Members") return header;
		}
		return undefined;
	});

	// Only add Timeline link if Members section exists
	if (membersHeaderEl) {
		// Rail-guard: do not inject if the link is already present
		if (membersHeaderEl.querySelector(`.${LINK_CLASS}`)) {
			// Timeline link already exists, but still check for Map link below
		} else {
			const link = document.createElement("span");
			link.className = LINK_CLASS;
			link.textContent = "[Timeline]";
			// Use a light blue in dark mode so the link is visible against the dark header
			if (isDarkPage(membersHeaderEl)) link.style.color = "#7eb8f7";
			link.addEventListener("click", () => {
				togglePanel(membersHeaderEl);
			});

			membersHeaderEl.appendChild(link);
		}
	}

	const showsHeaderEl = await waitForCallback<HTMLElement>(() => {
		const header = document.querySelector<HTMLElement>(
			".section_artist_shows .artist_page_header h2",
		);

		if (header && (header.textContent || "").trim() === "Shows") {
			return header;
		}

		return undefined;
	});

	if (showsHeaderEl) {
		addMapLink(showsHeaderEl);
	}
};
