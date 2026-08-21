// Find the "Members" info_content block via its header's next sibling
export function findMembersInfoContent(): Element | null {
	const headers = Array.from(document.querySelectorAll(".info_hdr"));
	const membersHdr = headers.find((h) =>
		/^\s*Members\b/i.test(h.textContent || ""),
	);
	if (!membersHdr) return null;

	const content = membersHdr.nextElementSibling;
	if (content?.classList.contains("info_content")) return content;

	return membersHdr.parentElement?.querySelector(".info_content") ?? null;
}

// Given an info header, find its next adjacent info_content block
export function findAdjacentInfoContent(
	headerEl: HTMLElement,
): HTMLElement | null {
	let el: Element | null = headerEl;
	for (let i = 0; i < 12; i++) {
		if (!el) return null;
		el = el.nextElementSibling;
		if (!el) return null;
		if (el.classList?.contains("info_content")) return el as HTMLElement;
		if (el.classList?.contains("info_hdr")) return null;
	}
	return null;
}

export function insertPanelAfterLastRenderedTextArtist(
	panelEl: HTMLElement,
	headerEl: HTMLElement | null,
): boolean {
	const infoContent = headerEl
		? findAdjacentInfoContent(headerEl)
		: findMembersInfoContent();
	if (!infoContent) return false;

	const rendered = Array.from(
		infoContent.querySelectorAll("span.rendered_text"),
	).filter((span: Element) => !!span.querySelector("a.artist"));

	const anchor = rendered.at(-1);
	(anchor ?? infoContent).after(panelEl);
	return true;
}
