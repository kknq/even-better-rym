// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import {
	installDiscographySortPatch,
	type PatchWindow,
	type RymArtistPage,
} from "./patch";

const DEFAULT_SORT = "release_date.a,title.a";

function section(type: string, truncated: boolean) {
	return `
		<div class="disco_showing">
			${truncated ? `<span id="disco_header_show_link_${type}">show all</span>` : ""}
		</div>
		<div id="disco_header_${type}">
			<input type="hidden" id="disco_sort" value="${DEFAULT_SORT}">
		</div>
		<div id="disco_type_${type}">partial</div>`;
}

const renderDiscography = () => section("s", false) + section("m", true);

// Mimics RYM's artist.js: it reads/writes only the first #disco_sort input and
// the server re-renders every section with the default sort.
function createRymPage(
	requests: { action: string; sort: string; type?: string }[],
) {
	const firstSort = () =>
		document.querySelector<HTMLInputElement>("#disco_sort")?.value ?? "";
	const page: RymArtistPage & {
		sortDiscography: (sort: string) => void;
	} = {
		discoSection: "music",
		sortDiscography(sort) {
			const input = document.querySelector<HTMLInputElement>("#disco_sort");
			if (input) input.value = sort;
			win.RYMartistPage?._doSearch(true);
		},
		_doSearch() {
			requests.push({ action: "FilterDiscography", sort: firstSort() });
			const root = document.getElementById("discography");
			if (root) root.innerHTML = "Loading...";
		},
		_searchCallback(_term, html) {
			const root = document.getElementById("discography");
			if (root) root.innerHTML = String(html);
		},
		expandDiscographySection(type) {
			document.getElementById(`disco_header_${String(type)}`)?.scrollIntoView();
			requests.push({
				action: "ExpandDiscographySection",
				sort: firstSort(),
				type: String(type),
			});
		},
		_expandDiscographySectionCallback(type, html) {
			const target = document.getElementById(`disco_type_${String(type)}`);
			if (target) target.innerHTML = String(html);
			document.getElementById(`disco_header_${String(type)}`)?.scrollIntoView();
		},
	};
	return page;
}

type TestPage = ReturnType<typeof createRymPage>;
type TestWindow = PatchWindow & { RYMartistPage?: TestPage };
const win = window as TestWindow;

// Installs exactly as the content script does: stringified, in page scope.
const injectPatch = () => {
	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	const run = new Function(
		`(${installDiscographySortPatch.toString()})(window);`,
	) as () => void;
	run();
};

// Stand-in for RYM's inline onclick on the "show all" links.
document.addEventListener("click", (event) => {
	const link = (event.target as HTMLElement).closest(
		"[id^=disco_header_show_link_]",
	);
	if (link) win.RYMartistPage?.expandDiscographySection(link.id.slice(-1));
});

let requests: { action: string; sort: string; type?: string }[];
let scrolls: ReturnType<typeof vi.fn<() => void>>;

beforeEach(() => {
	requests = [];
	document.body.innerHTML = `<div id="discography">${renderDiscography()}</div>`;
	win.RYMartistPage = createRymPage(requests);
	scrolls = vi.fn<() => void>();
	Element.prototype.scrollIntoView = scrolls;
	injectPatch();
});

const page = () => win.RYMartistPage!;
const sortValues = () =>
	[
		...document.querySelectorAll<HTMLInputElement>('input[id="disco_sort"]'),
	].map((input) => input.value);

describe("discography sort patch", () => {
	test("keeps the chosen sort when showing all releases after sorting", () => {
		page().sortDiscography("avg_rating.d");
		page()._searchCallback("", renderDiscography());

		expect(sortValues()).toEqual(["avg_rating.d", "avg_rating.d"]);

		document.getElementById("disco_header_show_link_m")?.click();

		expect(requests.at(-1)).toEqual({
			action: "ExpandDiscographySection",
			sort: "avg_rating.d",
			type: "m",
		});
	});

	test("re-expands sections after sorting without scrolling", () => {
		document.getElementById("disco_header_show_link_m")?.click();
		page()._expandDiscographySectionCallback("m", "all mixtapes");
		expect(scrolls).toHaveBeenCalledTimes(2);
		scrolls.mockClear();

		page().sortDiscography("title.a");
		page()._searchCallback("", renderDiscography());

		expect(requests.at(-1)).toEqual({
			action: "ExpandDiscographySection",
			sort: "title.a",
			type: "m",
		});
		page()._expandDiscographySectionCallback("m", "sorted mixtapes");

		expect(document.getElementById("disco_type_m")?.textContent).toBe(
			"sorted mixtapes",
		);
		expect(scrolls).not.toHaveBeenCalled();
		expect(
			Object.hasOwn(
				document.getElementById("disco_header_m") ?? {},
				"scrollIntoView",
			),
		).toBe(false);
	});

	test("does not re-expand sections for search results", () => {
		document.getElementById("disco_header_show_link_m")?.click();
		const count = requests.length;

		page()._searchCallback("bones", renderDiscography());

		expect(requests).toHaveLength(count);
	});

	test("installing twice does not double-wrap RYM functions", () => {
		const doSearch = page()._doSearch;
		injectPatch();
		expect(page()._doSearch).toBe(doSearch);
	});

	test("waits for RYM's artist script when it is not loaded yet", () => {
		const rym = createRymPage(requests);
		win.RYMartistPage = undefined;
		installDiscographySortPatch(win);
		win.RYMartistPage = rym;
		const original = rym._doSearch;

		window.dispatchEvent(new Event("load"));

		expect(rym._doSearch).not.toBe(original);
	});
});
