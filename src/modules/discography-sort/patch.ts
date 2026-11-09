type Callback = (...args: unknown[]) => unknown;

export type RymArtistPage = {
	discoSection?: string;
	_doSearch: Callback;
	_searchCallback: Callback;
	expandDiscographySection: Callback;
	_expandDiscographySectionCallback: Callback;
	ebrSortPatched?: boolean;
};

export type PatchWindow = Window & { RYMartistPage?: RymArtistPage };

// Runs in the page's main world, so it must stay self-contained: no imports
// or references to module-level values.
export function installDiscographySortPatch(win: PatchWindow): void {
	const install = (): boolean => {
		const page = win.RYMartistPage;
		if (!page) return false;
		if (page.ebrSortPatched) return true;
		page.ebrSortPatched = true;

		const doc = win.document;
		// RYM renders one hidden #disco_sort input per section but only reads
		// the first, and re-renders reset them to the default sort.
		const sortInputs = () =>
			Array.from(
				doc.querySelectorAll<HTMLInputElement>('input[id="disco_sort"]'),
			);
		let sort = sortInputs()[0]?.value ?? "";
		const expanded = new Set<string>();
		const quiet = new Set<string>();

		const syncSort = () => {
			if (!sort) return;
			for (const input of sortInputs()) input.value = sort;
		};

		const withoutScroll = (type: string, run: () => unknown) => {
			const header = doc.getElementById(`disco_header_${type}`);
			if (!header || !quiet.has(type)) return run();
			header.scrollIntoView = () => undefined;
			try {
				return run();
			} finally {
				delete (header as Partial<HTMLElement>).scrollIntoView;
			}
		};

		const doSearch = page._doSearch;
		page._doSearch = function (this: unknown, ...args: unknown[]) {
			const current = sortInputs()[0]?.value;
			if (current) sort = current;
			syncSort();
			return doSearch.apply(this, args);
		};

		const expand = page.expandDiscographySection;
		page.expandDiscographySection = function (
			this: unknown,
			...args: unknown[]
		) {
			const type = String(args[0]);
			expanded.add(type);
			syncSort();
			return withoutScroll(type, () => expand.apply(this, args));
		};

		const expandCallback = page._expandDiscographySectionCallback;
		page._expandDiscographySectionCallback = function (
			this: unknown,
			...args: unknown[]
		) {
			const type = String(args[0]);
			try {
				return withoutScroll(type, () => expandCallback.apply(this, args));
			} finally {
				quiet.delete(type);
			}
		};

		const searchCallback = page._searchCallback;
		page._searchCallback = function (this: unknown, ...args: unknown[]) {
			const result = searchCallback.apply(this, args);
			syncSort();
			const term = typeof args[0] === "string" ? args[0] : "";
			if ((page.discoSection ?? "music") === "music" && term === "") {
				for (const type of expanded) {
					const link = doc.getElementById(`disco_header_show_link_${type}`);
					if (!link) continue;
					quiet.add(type);
					link.click();
				}
			}
			return result;
		};

		return true;
	};

	if (!install()) win.addEventListener("load", install, { once: true });
}
