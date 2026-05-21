import { waitForCallback } from "~/shared/utils/dom";

import { togglePanel } from "./panel";
import { isDarkPage } from "./theme";

const LINK_CLASS = "rymmt-link";

export const main = async (): Promise<void> => {
	const membersHeaderEl = await waitForCallback<HTMLElement>(() => {
		const headers = document.querySelectorAll<HTMLElement>(".info_hdr");
		for (const header of headers) {
			if ((header.textContent || "").trim() === "Members") return header;
		}
		return undefined;
	});

	// Rail-guard: do not inject if the link is already present
	if (membersHeaderEl.querySelector(`.${LINK_CLASS}`)) return;

	const link = document.createElement("span");
	link.className = LINK_CLASS;
	link.textContent = "[Timeline]";
	// Use a light blue in dark mode so the link is visible against the dark header
	if (isDarkPage(membersHeaderEl)) link.style.color = "#7eb8f7";
	link.addEventListener("click", () => {
		togglePanel(membersHeaderEl);
	});

	membersHeaderEl.appendChild(link);
};
