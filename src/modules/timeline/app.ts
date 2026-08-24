import { waitForDocumentReady } from "~/shared/utils/dom";
import { isDarkPage } from "~/shared/utils/theme";
import { addMapLink } from "./map-link";
import { togglePanel } from "./panel";

const LINK_CLASS = "rymmt-link";

export const main = async (): Promise<void> => {
	await waitForDocumentReady();

	const showsHeaderEl = document.querySelector<HTMLElement>(
		".section_artist_shows .artist_page_header h2",
	);

	if (showsHeaderEl?.textContent?.trim() === "Shows") {
		addMapLink(showsHeaderEl);
	}

	const membersHeaderEl = [
		...document.querySelectorAll<HTMLElement>(".info_hdr"),
	].find((header) => header.textContent?.trim() === "Members");

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
};
