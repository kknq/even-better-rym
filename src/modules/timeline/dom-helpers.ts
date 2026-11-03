const MEMBER_HEADINGS = new Set([
	"members",
	"miembros",
	"membres",
	"jäsenet",
	"üyeler",
	"mitglieder",
	// Provisional translations, not yet verified against RYM.
	"członkowie",
	"membri",
	"membros",
	"участники",
	"leden",
]);

export function findMembersHeader(): HTMLElement | null {
	const headers = Array.from(
		document.querySelectorAll<HTMLElement>(".artist_info_main .info_hdr"),
	);
	return (
		headers.find((header) => {
			const label = header.cloneNode(true) as HTMLElement;
			for (const link of label.querySelectorAll(".rymmt-link")) {
				link.remove();
			}
			return MEMBER_HEADINGS.has(label.textContent?.trim().toLowerCase() ?? "");
		}) ?? null
	);
}

export function findMembersInfoContent(): Element | null {
	const header = findMembersHeader();
	return header ? findAdjacentInfoContent(header) : null;
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
