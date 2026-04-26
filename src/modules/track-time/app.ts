import { waitForElement } from "~/shared/utils/dom";

import { convertTotalTime } from "./convert";

export async function main() {
	await waitForElement(".tracklist_total");

	for (const el of document.querySelectorAll<HTMLElement>(".tracklist_total")) {
		const converted = el.textContent ? convertTotalTime(el.textContent) : null;
		if (converted) el.textContent = converted;
	}
}
