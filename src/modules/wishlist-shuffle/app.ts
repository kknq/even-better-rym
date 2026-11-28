import { alignPagination } from "~/modules/user-collection/pagination";
import {
	collectionUrl,
	parseCollectionUrl,
	savedCollectionUrl,
} from "~/modules/user-collection/url";
import { getCollectionSettings } from "~/shared/collection/settings";
import { getModuleEnabled } from "~/shared/page-settings";
import { waitForDocumentReady } from "~/shared/utils/dom";
import { isOwnUserPage } from "~/shared/utils/user";

const pageSize = 1_000_000_000;
const shuffleHash = "#ebr-wishlist-shuffle";

export function shuffleUrl(href: string): string {
	const url = new URL(
		collectionUrl(href, {
			family: "pageSize",
			value: `n${pageSize}`,
			view: "default",
		}),
		href,
	);
	url.hash = shuffleHash;
	return url.href;
}

function restripeRows(body: HTMLTableSectionElement): void {
	const hidingRatings = document.body.classList.contains("ebr-hide-ratings");
	let index = 0;
	for (const row of Array.from(body.rows)) {
		row.classList.remove("ebr-collection-row-light", "ebr-collection-row-dark");
		if (
			/^page_catalog_item_\d+$/.test(row.id) ||
			row.querySelector(".ebr-collection-review-content") ||
			(!hidingRatings &&
				row.querySelector(".or_q_review_td .track_rating_header"))
		) {
			row.classList.add(
				index++ % 2 === 0
					? "ebr-collection-row-light"
					: "ebr-collection-row-dark",
			);
		}
	}
}

export function shuffleRows(table: HTMLTableElement): number {
	const body = table.tBodies[0];
	if (!body || table.tBodies.length !== 1) {
		throw new Error("Wishlist layout is not supported.");
	}
	const groups: HTMLTableRowElement[][] = [];
	let currentGroup: HTMLTableRowElement[] | undefined;
	for (const row of Array.from(body.rows)) {
		if (/^page_catalog_item_\d+$/.test(row.id)) {
			currentGroup = [];
			groups.push(currentGroup);
		}
		currentGroup?.push(row);
	}
	if (!groups.length) throw new Error("No wishlist releases were found.");

	for (let i = groups.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[groups[i], groups[j]] = [groups[j], groups[i]];
	}
	const striped = body.querySelector(
		".ebr-collection-row-light, .ebr-collection-row-dark",
	);
	for (const group of groups) body.append(...group);
	if (striped) restripeRows(body);
	return groups.length;
}

export function setupWishlistShuffle(
	navigate: (url: string) => void = (url) => location.assign(url),
): void {
	if (!isOwnUserPage()) return;

	if (location.pathname.startsWith("/~")) {
		const tab = document.querySelector<HTMLElement>("#musicwanted");
		const heading = tab?.querySelector<HTMLElement>(".ookii");
		const link = heading?.querySelector<HTMLAnchorElement>(
			'a[href*="/collection/"][href*="/wishlist"]',
		);
		if (!heading || !link) return;
		const button = document.createElement("button");
		button.type = "button";
		button.className = "btn btn_small ebr-wishlist-shuffle-button";
		button.textContent = "Shuffle wishlist";
		button.addEventListener("click", () => navigate(shuffleUrl(link.href)));
		heading.append(button);
		return;
	}

	const current = parseCollectionUrl(location.href);
	if (current.kind !== "music" || !current.modifiers.includes("wishlist"))
		return;
	const table = document.querySelector<HTMLTableElement>(
		"#content table.mbgen",
	);
	const content = document.querySelector<HTMLElement>("#content");
	if (!content) return;
	const navigation = content.querySelector<HTMLElement>(".navspan");
	let row =
		navigation?.parentElement ??
		content.querySelector<HTMLElement>(".ebr-collection-pagination");
	if (!row) {
		row = document.createElement("div");
		row.className = "ebr-wishlist-shuffle-row";
		if (table) table.before(row);
		else content.prepend(row);
	}
	row.classList.add("ebr-collection-pagination", "ebr-wishlist-shuffle-row");
	if (!navigation) row.classList.add("ebr-wishlist-shuffle-no-navigation");
	const container = document.createElement("div");
	container.className = "ebr-wishlist-shuffle-controls";
	const button = document.createElement("button");
	button.type = "button";
	button.className = "btn btn_small ebr-wishlist-shuffle-button";
	button.textContent = "Shuffle wishlist";
	const status = document.createElement("span");
	status.setAttribute("role", "status");
	status.className = "ebr-wishlist-shuffle-status";
	container.append(button, status);
	row.prepend(container);
	alignPagination(row, navigation ?? undefined);

	const shuffle = () => {
		if (
			!current.modifiers.includes(`n${pageSize}`) ||
			current.view !== "default" ||
			document.querySelector(
				".navspan .navlinknum, .navspan .navlinknext, .navspan .navlinkprev",
			) ||
			[...document.querySelectorAll(".navspan .navlinkcurrent")].some(
				(page) => page.textContent?.trim() !== "1",
			)
		) {
			status.textContent =
				"Could not shuffle wishlist: RYM did not return the entire wishlist on one page. Shuffle is unavailable.";
			return;
		}
		if (!table) {
			status.textContent =
				"Could not shuffle wishlist: Wishlist layout is not supported.";
			return;
		}
		try {
			const count = shuffleRows(table);
			status.textContent = `Shuffled ${count} releases.`;
		} catch (error) {
			status.textContent = `Could not shuffle wishlist: ${error instanceof Error ? error.message : String(error)}`;
		}
	};
	button.addEventListener("click", () => {
		if (
			current.modifiers.includes(`n${pageSize}`) &&
			current.view === "default" &&
			!document.querySelector(".navspan .navlinkprev")
		)
			shuffle();
		else navigate(shuffleUrl(location.href));
	});

	if (location.hash === shuffleHash) {
		history.replaceState(
			history.state,
			"",
			`${location.pathname}${location.search}`,
		);
		shuffle();
	}
}

export async function main(): Promise<void> {
	await waitForDocumentReady();
	if (
		location.hash === shuffleHash &&
		location.pathname.startsWith("/collection/") &&
		isOwnUserPage() &&
		(await getModuleEnabled("userCollection"))
	) {
		const settings = await getCollectionSettings("music");
		if (savedCollectionUrl(location.href, settings)) return;
	}
	setupWishlistShuffle();
}
