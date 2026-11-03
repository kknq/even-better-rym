import type {
	ChartShortcutActionId,
	ChartShortcutGroup,
} from "~/shared/chart-shortcuts/actions";
import { CHART_SHORTCUT_ACTIONS } from "~/shared/chart-shortcuts/actions";
import type { ChartShortcutBindings } from "~/shared/chart-shortcuts/binding";
import { comboFromEvent, formatCombo } from "~/shared/chart-shortcuts/binding";
import {
	getChartShortcutBindings,
	subscribeToChartShortcutBindings,
} from "~/shared/chart-shortcuts/settings";
import { runScript, waitForElement } from "~/shared/utils/dom";

type FilterType =
	| "genre_include"
	| "genre_exclude"
	| "sec_genre_include"
	| "sec_genre_exclude"
	| "genre_either_include"
	| "genre_either_exclude"
	| "descriptor_include"
	| "descriptor_exclude";

type CheckboxKind = "sub" | "all";

type Scope = "genre" | "descriptor";

type AdvancedToggle = {
	id: string;
	handler: string;
};

type BrowseResult = {
	display_name?: string;
	name?: string;
	component?: string;
	path?: string;
	assoc_id?: number;
};

type NativeQueryResult = {
	subBrowseActive: boolean;
	item: BrowseResult | null;
};

const INPUT_ID = "ui_browser_input_page_charts_settings";
const BROWSER_ID = "page_charts_settings";
const NATIVE_QUERY_EVENT = "EbrChartBrowserFirstMatchEvent";
const RYMCHART_PATCH_ATTEMPTS = 20;
const RYMCHART_PATCH_INTERVAL_MS = 200;
const SHORTCUT_SECTION_SELECTOR = ".page_chart_query_free_section_new";
const SHORTCUT_LABEL_SELECTOR = ".page_chart_query_free_section_label";
const HINT_TOGGLE_STYLE = `
	.ebr-hint-toggle {
		cursor: pointer;
	}
	.ebr-hint-toggle:hover {
		text-decoration: underline;
	}
`;

const ACTION_EFFECTS: Record<
	ChartShortcutActionId,
	(input: HTMLInputElement) => void
> = {
	includeGenre: (input) =>
		void applyNativeMatch("genre", "genre_include", input),
	includeInfluence: (input) =>
		void applyNativeMatch("genre", "sec_genre_include", input),
	includeEither: (input) =>
		void applyNativeMatch("genre", "genre_either_include", input),
	includeDescriptor: (input) =>
		void applyNativeMatch("descriptor", "descriptor_include", input),
	excludeGenre: (input) =>
		void applyNativeMatch("genre", "genre_exclude", input),
	excludeInfluence: (input) =>
		void applyNativeMatch("genre", "sec_genre_exclude", input),
	excludeEither: (input) =>
		void applyNativeMatch("genre", "genre_either_exclude", input),
	excludeDescriptor: (input) =>
		void applyNativeMatch("descriptor", "descriptor_exclude", input),

	toggleSubGenreInclude: () => toggleCheckbox("genre_include", "sub"),
	toggleSubInfluenceInclude: () => toggleCheckbox("sec_genre_include", "sub"),
	toggleSubEitherInclude: () => toggleCheckbox("genre_either_include", "sub"),
	toggleSubDescriptorInclude: () => toggleCheckbox("descriptor_include", "sub"),
	toggleSubGenreExclude: () => toggleCheckbox("genre_exclude", "sub"),
	toggleSubInfluenceExclude: () => toggleCheckbox("sec_genre_exclude", "sub"),
	toggleSubEitherExclude: () => toggleCheckbox("genre_either_exclude", "sub"),
	toggleSubDescriptorExclude: () => toggleCheckbox("descriptor_exclude", "sub"),

	toggleAllGenreInclude: () => toggleCheckbox("genre_include", "all"),
	toggleAllInfluenceInclude: () => toggleCheckbox("sec_genre_include", "all"),
	toggleAllEitherInclude: () => toggleCheckbox("genre_either_include", "all"),
	toggleAllDescriptorInclude: () => toggleCheckbox("descriptor_include", "all"),
	toggleAllGenreExclude: () => toggleCheckbox("genre_exclude", "all"),
	toggleAllInfluenceExclude: () => toggleCheckbox("sec_genre_exclude", "all"),
	toggleAllEitherExclude: () => toggleCheckbox("genre_either_exclude", "all"),
	toggleAllDescriptorExclude: () => toggleCheckbox("descriptor_exclude", "all"),

	onlyRatingsSelf: () =>
		toggleAdvanced({
			id: "page_chart_query_advanced_users_self",
			handler: "onClickUsersSelf",
		}),
	onlyRatingsFollowing: () =>
		toggleAdvanced({
			id: "page_chart_query_advanced_users_following",
			handler: "onClickUsersFollowing",
		}),
	onlyRatingsFollowers: () =>
		toggleAdvanced({
			id: "page_chart_query_advanced_users_followers",
			handler: "onClickUsersFollowers",
		}),

	excludeRated: () =>
		toggleAdvanced({
			id: "page_chart_query_advanced_exclude_label_ratings",
			handler: "onClickExcludeCatRatings",
		}),
	excludeCataloged: () =>
		toggleAdvanced({
			id: "page_chart_query_advanced_exclude_label_catalog",
			handler: "onClickExcludeCatCatalog",
		}),
	excludeWishlisted: () =>
		toggleAdvanced({
			id: "page_chart_query_advanced_exclude_label_wishlist",
			handler: "onClickExcludeCatWishlist",
		}),

	updateChart: () => updateChart(),
};

let comboToAction = new Map<string, ChartShortcutActionId>();

export async function main(): Promise<void> {
	const [input, bindings] = await Promise.all([
		waitForElement<HTMLInputElement>(`#${INPUT_ID}`),
		getChartShortcutBindings(),
	]);
	mount(input, bindings);
}

function itemId(item: BrowseResult): number | null {
	if (item.assoc_id != null) return item.assoc_id;
	const match = /\/(\d+)$/.exec(item.path ?? "");
	return match ? Number.parseInt(match[1], 10) : null;
}

function applyItem(filterType: FilterType, item: BrowseResult): void {
	const name = item.display_name ?? item.name ?? "";
	const id = itemId(item);
	if (!name || id == null) return;

	void runScript(`
		(function () {
			var chart = window.RYMchart;
			if (!chart) return;
			var originalCreateChart = chart.onClickCreateChart;
			chart.onClickCreateChart = function () {};
			try {
				chart.addBrowserItem(${JSON.stringify(filterType)}, ${id}, ${JSON.stringify(name)});
			} finally {
				chart.onClickCreateChart = originalCreateChart;
			}
		})();
	`);
}

function toggleCheckbox(filterType: FilterType, kind: CheckboxKind): void {
	const suffix = kind === "sub" ? "sub_items" : "all";
	const handlerName =
		kind === "sub" ? "onClickBrowserItemSub" : "onClickBrowserItemAll";
	const id = `page_chart_query_free_section_${filterType}_${suffix}`;

	void runScript(`
		(function () {
			var checkbox = document.getElementById(${JSON.stringify(id)});
			if (!checkbox) return;
			checkbox.checked = !checkbox.checked;
			var chart = window.RYMchart;
			if (chart && typeof chart.${handlerName} === "function") {
				chart.${handlerName}(${JSON.stringify(filterType)});
			}
		})();
	`);
}

function toggleAdvanced(toggle: AdvancedToggle): void {
	void runScript(`
		(function () {
			var checkbox = document.getElementById(${JSON.stringify(toggle.id)});
			if (!checkbox) return;
			checkbox.checked = !checkbox.checked;
			var chart = window.RYMchart;
			if (chart && typeof chart.${toggle.handler} === "function") {
				chart.${toggle.handler}();
			}
		})();
	`);
}

/**
 * Reads RYM's own native browse-widget state via an injected script rather
 * than a separate fetch, so shortcuts always match what RYM's own dropdown
 * would show. Deliberately reads RYMbrowser.resultCache (keyed by the exact
 * {q, component} that produced it) rather than currentResultSet ("last
 * rendered", which can be stale relative to the just-typed query if a
 * shortcut is pressed before RYM's own debounced search round-trip lands) -
 * a missing cache entry for the current input value means no match yet,
 * not a wrong one.
 */
function queryNativeBrowser(scope: Scope): Promise<NativeQueryResult> {
	const promise = new Promise<NativeQueryResult>((resolve) => {
		const listener = (e: Event) => {
			document.removeEventListener(NATIVE_QUERY_EVENT, listener);
			resolve((e as CustomEvent).detail as NativeQueryResult);
		};
		document.addEventListener(NATIVE_QUERY_EVENT, listener);
	});

	void runScript(`
		(function () {
			var browser = window.RYMbrowser;
			var id = ${JSON.stringify(BROWSER_ID)};
			var path = (browser && browser.path && browser.path[id]) || [];
			var subBrowseActive = path.length > 0;
			var item = null;
			if (!subBrowseActive && browser && browser.resultCache) {
				var input = document.getElementById(${JSON.stringify(INPUT_ID)});
				var root = document.getElementById("ui_browser_" + id);
				var query = input ? input.value.trim() : "";
				var component = root ? root.dataset.component || "" : "";
				var cacheKey = JSON.stringify({ q: query, component: component });
				var resultSet = browser.resultCache[cacheKey];
				var results = (resultSet && resultSet.results) || [];
				for (var i = 0; i < results.length; i++) {
					var result = results[i];
					var resultComponent = result.component || (result.path || "").split("/")[0];
					if (resultComponent === ${JSON.stringify(scope)}) {
						item = result;
						break;
					}
				}
			}
			document.dispatchEvent(
				new CustomEvent(${JSON.stringify(NATIVE_QUERY_EVENT)}, {
					detail: { subBrowseActive: subBrowseActive, item: item },
				}),
			);
		})();
	`);

	return promise;
}

async function applyNativeMatch(
	scope: Scope,
	filterType: FilterType,
	input: HTMLInputElement,
): Promise<void> {
	const { subBrowseActive, item } = await queryNativeBrowser(scope);
	if (subBrowseActive || !item) return;

	applyItem(filterType, item);
	resetInput(input);
}

function findShortcutLabel(input: HTMLInputElement): HTMLElement | null {
	const section = input.closest<HTMLElement>(SHORTCUT_SECTION_SELECTOR);
	return section?.querySelector<HTMLElement>(SHORTCUT_LABEL_SELECTOR) ?? null;
}

function renderHintLines(bindings: ChartShortcutBindings): DocumentFragment {
	const groups = new Map<ChartShortcutGroup, string[]>();

	for (const action of CHART_SHORTCUT_ACTIONS) {
		const combos = bindings[action.id];
		if (combos.length === 0) continue;

		const comboLabel = combos.map((combo) => formatCombo(combo)).join(" or ");
		const lines = groups.get(action.group) ?? [];
		lines.push(`${comboLabel} — ${action.hint}`);
		groups.set(action.group, lines);
	}

	const fragment = document.createDocumentFragment();
	for (const line of [...groups.values()]
		.map((lines) => lines.join("\n"))
		.join("\n\n")
		.split("\n")) {
		fragment.append(
			document.createElement("br"),
			document.createTextNode(line),
		);
	}
	return fragment;
}

function insertShortcutHint(
	input: HTMLInputElement,
	bindings: ChartShortcutBindings,
): HTMLElement | null {
	const label = findShortcutLabel(input);
	if (!label || label.dataset.ebrHint) return null;

	label.dataset.ebrHint = "1";

	const style = document.createElement("style");
	style.textContent = HINT_TOGGLE_STYLE;
	document.head.appendChild(style);

	const hintLines = document.createElement("span");
	hintLines.style.display = "none";
	hintLines.append(renderHintLines(bindings));

	const toggle = document.createElement("span");
	toggle.className = "ebr-hint-toggle";
	toggle.textContent = "Show shortcut hints";

	toggle.addEventListener("click", (event) => {
		event.stopPropagation();
		const isHidden = hintLines.style.display === "none";
		hintLines.style.display = isHidden ? "" : "none";
		toggle.textContent = isHidden
			? "Hide shortcut hints"
			: "Show shortcut hints";
	});

	label.append(document.createElement("br"), toggle, hintLines);
	return hintLines;
}

function resetInput(input: HTMLInputElement): void {
	input.value = "";
}

function updateChart(): void {
	void runScript(`
		if (window.RYMchart && typeof window.RYMchart.onClickCreateChart === "function") {
			window.RYMchart.onClickCreateChart();
		}
	`);
}

function buildComboToAction(
	bindings: ChartShortcutBindings,
): Map<string, ChartShortcutActionId> {
	const map = new Map<string, ChartShortcutActionId>();
	for (const [actionId, combos] of Object.entries(bindings) as [
		ChartShortcutActionId,
		string[],
	][]) {
		for (const combo of combos) map.set(combo, actionId);
	}
	return map;
}

function onKeyDown(event: KeyboardEvent, input: HTMLInputElement): void {
	const actionId = comboToAction.get(comboFromEvent(event));
	if (!actionId) return;

	event.preventDefault();
	event.stopPropagation();
	ACTION_EFFECTS[actionId](input);
}

function isOtherEditableTarget(
	target: EventTarget | null,
	input: HTMLInputElement,
): boolean {
	if (!(target instanceof HTMLElement) || target === input) return false;
	return (
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.isContentEditable
	);
}

function patchRYMChartRemoval(): void {
	void runScript(`
		(function () {
			var attempts = 0;
			var interval = setInterval(function () {
				attempts += 1;
				if (attempts > ${RYMCHART_PATCH_ATTEMPTS}) {
					clearInterval(interval);
					return;
				}
				var chart = window.RYMchart;
				if (!chart || typeof chart.removeBrowserItem !== "function") return;
				clearInterval(interval);
				var original = chart.removeBrowserItem.bind(chart);
				chart.removeBrowserItem = function () {
					var originalCreateChart = chart.onClickCreateChart;
					chart.onClickCreateChart = function () {};
					try {
						return original.apply(chart, arguments);
					} finally {
						chart.onClickCreateChart = originalCreateChart;
					}
				};
			}, ${RYMCHART_PATCH_INTERVAL_MS});
		})();
	`);
}

function mount(
	input: HTMLInputElement,
	initialBindings: ChartShortcutBindings,
): void {
	const hintLines = insertShortcutHint(input, initialBindings);
	comboToAction = buildComboToAction(initialBindings);

	// Keeps an already-open chart page in sync with a rebind made in the
	// popup, without requiring a page refresh.
	subscribeToChartShortcutBindings((bindings) => {
		comboToAction = buildComboToAction(bindings);
		if (hintLines) hintLines.replaceChildren(renderHintLines(bindings));
	});

	document.addEventListener(
		"keydown",
		(event) => {
			if (isOtherEditableTarget(event.target, input)) return;
			onKeyDown(event, input);
		},
		true,
	);

	patchRYMChartRemoval();
}
