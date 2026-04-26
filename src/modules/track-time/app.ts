import { waitForElement } from "~/shared/utils/dom";

import { convertDuration, convertTotalTime } from "./convert";

export async function main() {
	await waitForElement(".tracklist_total");

	convertAll();

	new MutationObserver(() => convertAll()).observe(document.body, {
		childList: true,
		subtree: true,
	});
}

function convertAll() {
	convertElements(".tracklist_total", convertTotalTime);
	convertElements(".tracklist_duration", convertDuration);
}

function convertElements(selector: string, convert: (text: string) => string | null) {
	for (const el of document.querySelectorAll<HTMLElement>(selector)) {
		const text = el.textContent;
		if (!text) continue;

		if (text.includes(":")) {
			const parts = text.split(":");
			if (parts.length === 4) continue;
		}

		const converted = convert(text);
		if (converted) el.textContent = converted;
	}
}
