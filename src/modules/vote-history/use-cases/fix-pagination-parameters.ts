import { waitForDocumentReady } from "~/shared/utils/dom";

import { getPaginationUrl } from "./history-urls";

export default async function fixPaginationParameters(): Promise<void> {
	await waitForDocumentReady();

	const parameters = new URLSearchParams(globalThis.location.search);
	const show = Number.parseInt(parameters.get("show") ?? "100", 10);
	const start = Number.parseInt(parameters.get("start") ?? "0", 10);

	for (const node of document.querySelectorAll<HTMLAnchorElement>(
		"a.navlinknum",
	)) {
		const pageNumber = Number.parseInt(node.text, 10);
		fixPaginationLink(node, (pageNumber - 1) * show);
	}

	for (const node of document.querySelectorAll<HTMLAnchorElement>(
		"a.navlinkprev",
	)) {
		fixPaginationLink(node, start - show);
	}

	for (const node of document.querySelectorAll<HTMLAnchorElement>(
		"a.navlinknext",
	)) {
		fixPaginationLink(node, start + show);
	}
}

function fixPaginationLink(node: HTMLAnchorElement, start: number): void {
	const href = getPaginationUrl(
		globalThis.location.pathname,
		globalThis.location.search,
		start,
	);
	node.href = href;

	node.addEventListener(
		"click",
		(event) => {
			if (
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}

			event.preventDefault();
			event.stopImmediatePropagation();
			globalThis.location.href = href;
		},
		{ capture: true },
	);
}
