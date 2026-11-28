import { loadIssues } from "~/shared/artist-discography";
import { waitForDocumentReady } from "~/shared/utils/dom";

const catalogSelector = '.disco_cat_inner_issue [id^="disco_cat_catalog_msg_"]';

function ratings(root: ParentNode): number[] {
	return [...root.querySelectorAll(catalogSelector)].flatMap((element) => {
		const match = /^(0\.5|[1-4](?:\.0|\.5)?|5(?:\.0)?)(?:\s*\/|$)/.exec(
			element.textContent?.trim() ?? "",
		);
		return match ? [Number(match[1])] : [];
	});
}

function render(row: HTMLElement, values: number[], count = "") {
	const catalog = row.querySelector<HTMLElement>(".disco_cat");
	if (!catalog) return;
	setLoading(catalog, false);
	let summary = catalog.querySelector<HTMLElement>(".ebr-issue-rating");
	if (values.length === 0) {
		delete row.dataset.ebrIssueRated;
		summary?.remove();
		catalog.classList.remove("ebr-issue-rating-catalog");
		return;
	}
	const average = values.reduce((sum, value) => sum + value, 0) / values.length;
	const first = values[0].toFixed(1);
	const averageText = average.toFixed(2).replace(/0$/, "");
	const description = `First rated issue: ${first}; average of ${values.length} rated ${values.length === 1 ? "issue" : "issues"}: ${averageText}; ${count} cataloged. Click to see all issues.`;
	if (!summary) {
		summary = document.createElement("span");
		summary.className = "ebr-issue-rating";
		catalog.append(summary);
	}
	if (summary.getAttribute("aria-label") !== description) {
		const firstValue = document.createElement("span");
		firstValue.className = "ebr-issue-rating-value";
		firstValue.append(first, label("1st"));
		const averageValue = document.createElement("span");
		averageValue.className = "ebr-issue-rating-value";
		averageValue.append(averageText, label("avg"));
		const countValue = document.createElement("span");
		countValue.className = "ebr-issue-rating-value";
		countValue.append(`(${count})`, label("cat."));
		summary.replaceChildren(firstValue, "/", averageValue, countValue);
		summary.setAttribute("aria-label", description);
		summary.title = description;
	}
	row.dataset.ebrIssueRated = "true";
	catalog.classList.add("ebr-issue-rating-catalog");
}

function setLoading(catalog: HTMLElement, loading: boolean) {
	const indicator = catalog.querySelector(".ebr-issue-rating-loading");
	if (!loading) {
		indicator?.remove();
		catalog.classList.remove("ebr-issue-rating-pending");
		return;
	}
	if (indicator) return;
	const status = document.createElement("span");
	status.className = "ebr-issue-rating-loading";
	status.setAttribute("role", "status");
	status.setAttribute("aria-label", "Loading issue ratings");
	const icon = document.createElement("i");
	icon.className = "fa fa-spinner fa-spin";
	icon.setAttribute("aria-hidden", "true");
	status.append(icon);
	catalog.classList.add("ebr-issue-rating-pending");
	catalog.append(status);
}

function label(text: string): HTMLElement {
	const element = document.createElement("span");
	element.className = "ebr-issue-rating-label";
	element.setAttribute("aria-hidden", "true");
	element.textContent = text;
	return element;
}

export async function main(): Promise<void> {
	await waitForDocumentReady();
	const root = document.querySelector("#discography");
	if (!root) return;
	const states = new WeakMap<Element, { status: string }>();

	function refresh() {
		for (const row of root?.querySelectorAll<HTMLElement>(".disco_release") ??
			[]) {
			const id = /^release_(\d+)$/.exec(row.id)?.[1];
			const status =
				row.querySelector(".disco_cat_inner")?.textContent?.trim() ?? "";
			const count = /^(\d+)\s+cataloged$/i.exec(status)?.[1];
			if (!id || !count) {
				states.delete(row);
				render(row, []);
				continue;
			}
			const panel = row.parentElement?.querySelector(`#issues_${id}`);
			if (panel?.querySelector(catalogSelector)) {
				states.set(row, { status });
				render(row, ratings(panel), count);
				continue;
			}
			const state = states.get(row);
			if (state?.status === status) continue;
			render(row, []);
			const next = { status };
			states.set(row, next);
			const catalog = row.querySelector<HTMLElement>(".disco_cat");
			if (catalog) setLoading(catalog, true);
			void loadIssues(id).then(
				(issues) => {
					if (states.get(row) !== next || !row.isConnected) return;
					const currentPanel = row.parentElement?.querySelector(
						`#issues_${id}`,
					);
					if (currentPanel?.querySelector(catalogSelector)) {
						render(row, ratings(currentPanel), count);
					} else if (issues.querySelector(catalogSelector)) {
						render(row, ratings(issues), count);
					} else {
						render(row, []);
						console.error(
							"EvenBetterRYM: issue ratings response is incomplete",
							id,
						);
					}
				},
				(error: unknown) => {
					if (states.get(row) === next) render(row, []);
					console.error("EvenBetterRYM: could not load issue ratings", error);
				},
			);
		}
	}

	new MutationObserver(refresh).observe(root, {
		childList: true,
		characterData: true,
		subtree: true,
	});
	refresh();
}
