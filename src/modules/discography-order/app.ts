import {
	getSectionOrder,
	isDefaultSectionOrder,
	watchSectionOrder,
} from "~/shared/discography-order/settings";
import { type ReleaseType, releaseTypes } from "~/shared/release-types";
import { waitForDocumentReady } from "~/shared/utils/dom";

type Section = { type: ReleaseType | null; nodes: Node[] };

const sectionIdPattern = /^disco_(?:header_showing|header|type)_([a-z])$/;

function sectionType(nodes: readonly Node[]): ReleaseType | null {
	for (const node of nodes) {
		if (!(node instanceof Element)) continue;
		for (const element of [node, ...node.querySelectorAll("[id^=disco_]")]) {
			const type = sectionIdPattern.exec(element.id)?.[1];
			if (type && type in releaseTypes) return type as ReleaseType;
		}
	}
	return null;
}

// Each section starts at its `.disco_header_top` and owns every following
// sibling (header row, release list, ads, markers) up to the next section.
export function readSections(root: Element): Section[] {
	const sections: Section[] = [];
	for (const node of root.childNodes) {
		if (
			node instanceof Element &&
			node.classList.contains("disco_header_top")
		) {
			sections.push({ type: null, nodes: [node] });
		} else {
			sections.at(-1)?.nodes.push(node);
		}
	}
	for (const section of sections) section.type = sectionType(section.nodes);
	return sections;
}

export function orderSections(
	root: Element,
	order: readonly ReleaseType[],
): boolean {
	const sections = readSections(root);
	let previousRank = -1;
	const ranked = sections.map((section, index) => {
		const rank = section.type ? order.indexOf(section.type) : -1;
		// Unrecognized sections stay attached to the section before them.
		if (rank !== -1) previousRank = rank;
		return { section, index, rank: rank === -1 ? previousRank : rank };
	});
	const sorted = [...ranked].sort(
		(a, b) => a.rank - b.rank || a.index - b.index,
	);
	if (sorted.every((entry, index) => entry === ranked[index])) return false;

	const fragment = document.createDocumentFragment();
	for (const { section } of sorted) fragment.append(...section.nodes);
	root.append(fragment);
	return true;
}

export async function main(): Promise<void> {
	await waitForDocumentReady();
	const element = document.getElementById("discography");
	if (!element) return;
	const root = element;
	let order = await getSectionOrder();

	// RYM replaces the whole discography when sorting or filtering.
	const observer = new MutationObserver(apply);
	function apply() {
		observer.disconnect();
		orderSections(root, order);
		if (!isDefaultSectionOrder(order)) {
			observer.observe(root, { childList: true });
		}
	}

	watchSectionOrder((next) => {
		order = next;
		apply();
	});
	if (!isDefaultSectionOrder(order)) apply();
}
