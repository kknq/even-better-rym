import { waitForCallback } from "~/shared/utils/dom";

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

	// Rail-guard: do not inject if the link is already present
	if (membersHeaderEl.querySelector(`.${LINK_CLASS}`)) return;

	const link = document.createElement("span");
	link.className = LINK_CLASS;
	link.textContent = "[Timeline]";
	link.addEventListener("click", () => {
		togglePanel(membersHeaderEl);
	});

	membersHeaderEl.appendChild(link);
};
