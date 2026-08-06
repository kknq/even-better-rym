import { runScript, waitForElement } from "~/shared/utils/dom";

type Category = "genre" | "sec_genre" | "genre_either" | "descriptor";

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

const IS_MAC = navigator.platform.toLowerCase().includes("mac");
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

const APPLY_KEY_CATEGORY: Record<string, Category> = {
	"1": "genre",
	"2": "sec_genre",
	"3": "genre_either",
	d: "descriptor",
};

const SUB_TOGGLE_KEY_CATEGORY: Record<string, Category> = {
	z: "genre",
	x: "sec_genre",
	c: "genre_either",
	s: "descriptor",
};

const ALL_TOGGLE_KEY_CATEGORY: Record<string, Category> = {
	q: "genre",
	w: "sec_genre",
	e: "genre_either",
	a: "descriptor",
};

const APPLY_SCOPE: Record<Category, Scope> = {
	genre: "genre",
	sec_genre: "genre",
	genre_either: "genre",
	descriptor: "descriptor",
};

const ADVANCED_USER_TOGGLE: Record<string, AdvancedToggle> = {
	f: {
		id: "page_chart_query_advanced_users_following",
		handler: "onClickUsersFollowing",
	},
	v: {
		id: "page_chart_query_advanced_users_followers",
		handler: "onClickUsersFollowers",
	},
	r: {
		id: "page_chart_query_advanced_users_self",
		handler: "onClickUsersSelf",
	},
};

const ADVANCED_EXCLUDE_TOGGLE: Record<string, AdvancedToggle> = {
	r: {
		id: "page_chart_query_advanced_exclude_label_ratings",
		handler: "onClickExcludeCatRatings",
	},
	f: {
		id: "page_chart_query_advanced_exclude_label_catalog",
		handler: "onClickExcludeCatCatalog",
	},
	v: {
		id: "page_chart_query_advanced_exclude_label_wishlist",
		handler: "onClickExcludeCatWishlist",
	},
};

const MODIFIER_LABEL = IS_MAC ? "control" : "alt";

const HINT_LINES = [
	`${MODIFIER_LABEL} + 1 — include first genre result as "genre"`,
	`${MODIFIER_LABEL} + 2 — include first genre result as "influence"`,
	`${MODIFIER_LABEL} + 3 — include first genre result as "either"`,
	`${MODIFIER_LABEL} + d — include first descriptor result as "descriptor"\n`,

	`${MODIFIER_LABEL} + shift + 1 — exclude first genre result as "genre"`,
	`${MODIFIER_LABEL} + shift + 2 — exclude first genre result as "influence"`,
	`${MODIFIER_LABEL} + shift + 3 — exclude first genre result as "either"`,
	`${MODIFIER_LABEL} + shift + d — exclude first descriptor result as "descriptor"\n`,

	`${MODIFIER_LABEL} + z — toggle "Include sub-genres" for "genres"`,
	`${MODIFIER_LABEL} + x — toggle "Include sub-genres" for "influences"`,
	`${MODIFIER_LABEL} + c — toggle "Include sub-genres" for "either"`,
	`${MODIFIER_LABEL} + s — toggle "Include sub-genres" for "descriptors"\n`,

	`${MODIFIER_LABEL} + shift + z — toggle "Exclude sub-genres" for "genres"`,
	`${MODIFIER_LABEL} + shift + x — toggle "Exclude sub-genres" for "influences"`,
	`${MODIFIER_LABEL} + shift + c — toggle "Exclude sub-genres" for "either"`,
	`${MODIFIER_LABEL} + shift + s — toggle "Exclude sub-genres" for "descriptors"\n`,

	`${MODIFIER_LABEL} + q — toggle "Must contain all" for "genres"`,
	`${MODIFIER_LABEL} + w — toggle "Must contain all" for "influences"`,
	`${MODIFIER_LABEL} + e — toggle "Must contain all" for "either"`,
	`${MODIFIER_LABEL} + a — toggle "Must contain all" for "descriptors"\n`,

	`${MODIFIER_LABEL} + shift + q — toggle "Only exclude items containing all" for "genres"`,
	`${MODIFIER_LABEL} + shift + w — toggle "Only exclude items containing all" for "influences"`,
	`${MODIFIER_LABEL} + shift + e — toggle "Only exclude items containing all" for "either"`,
	`${MODIFIER_LABEL} + shift + a — toggle "Only exclude items containing all" for "descriptors"\n`,

	`${MODIFIER_LABEL} + r — toggle "Only include ratings from myself"`,
	`${MODIFIER_LABEL} + f — toggle "Only include ratings from users I'm following"`,
	`${MODIFIER_LABEL} + v — toggle "Only include ratings from users who follow me"\n`,

	`${MODIFIER_LABEL} + shift + r — toggle "Exclude releases I've rated"`,
	`${MODIFIER_LABEL} + shift + f — toggle "Exclude releases I've cataloged"`,
	`${MODIFIER_LABEL} + shift + v — toggle "Exclude releases I've wishlisted"\n`,

	`${MODIFIER_LABEL} + space — "Update chart"`,
	`${MODIFIER_LABEL} + enter — "Update chart"`,
];

export async function main(): Promise<void> {
	const input = await waitForElement<HTMLInputElement>(`#${INPUT_ID}`);
	mount(input);
}

function filterTypeFor(category: Category, exclude: boolean): FilterType {
	return `${category}_${exclude ? "exclude" : "include"}` as FilterType;
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
 * shortcut is pressed before RYM's own debounced search round-trip lands) —
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

function insertShortcutHint(input: HTMLInputElement): void {
	const label = findShortcutLabel(input);
	if (!label || label.dataset.ebrHint) return;

	label.dataset.ebrHint = "1";

	const style = document.createElement("style");
	style.textContent = HINT_TOGGLE_STYLE;
	document.head.appendChild(style);

	const hintLines = document.createElement("span");
	hintLines.style.display = "none";
	hintLines.innerHTML = `<br>${HINT_LINES.map((line) =>
		line.replace(/\n/g, "<br>"),
	).join("<br>")}`;

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

function hasShortcutModifier(event: KeyboardEvent): boolean {
	// AltGr (common on European layouts) reports as altKey+ctrlKey together;
	// excluding ctrlKey here keeps AltGr character entry from misfiring shortcuts.
	return IS_MAC ? event.ctrlKey : event.altKey && !event.ctrlKey;
}

function handleApplyShortcut(
	event: KeyboardEvent,
	input: HTMLInputElement,
): boolean {
	if (!hasShortcutModifier(event)) return false;
	const category = APPLY_KEY_CATEGORY[event.key.toLowerCase()];
	if (!category) return false;

	const filterType = filterTypeFor(category, event.shiftKey);
	void applyNativeMatch(APPLY_SCOPE[category], filterType, input);
	return true;
}

function handleSubToggleShortcut(event: KeyboardEvent): boolean {
	if (!hasShortcutModifier(event)) return false;
	const category = SUB_TOGGLE_KEY_CATEGORY[event.key.toLowerCase()];
	if (!category) return false;

	toggleCheckbox(filterTypeFor(category, event.shiftKey), "sub");
	return true;
}

function handleAllToggleShortcut(event: KeyboardEvent): boolean {
	if (!hasShortcutModifier(event)) return false;
	const category = ALL_TOGGLE_KEY_CATEGORY[event.key.toLowerCase()];
	if (!category) return false;

	toggleCheckbox(filterTypeFor(category, event.shiftKey), "all");
	return true;
}

function handleAdvancedToggleShortcut(event: KeyboardEvent): boolean {
	if (!hasShortcutModifier(event)) return false;
	const table = event.shiftKey ? ADVANCED_EXCLUDE_TOGGLE : ADVANCED_USER_TOGGLE;
	const toggle = table[event.key.toLowerCase()];
	if (!toggle) return false;

	toggleAdvanced(toggle);
	return true;
}

function handleUpdateChartShortcut(event: KeyboardEvent): boolean {
	if (
		(event.key !== "Enter" && event.key !== " ") ||
		!hasShortcutModifier(event)
	)
		return false;
	updateChart();
	return true;
}

const KEY_HANDLERS = [
	handleApplyShortcut,
	handleSubToggleShortcut,
	handleAllToggleShortcut,
	handleAdvancedToggleShortcut,
	handleUpdateChartShortcut,
];

function onKeyDown(event: KeyboardEvent, input: HTMLInputElement): void {
	for (const handler of KEY_HANDLERS) {
		if (!handler(event, input)) continue;
		event.preventDefault();
		event.stopPropagation();
		return;
	}
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

function mount(input: HTMLInputElement): void {
	insertShortcutHint(input);

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
