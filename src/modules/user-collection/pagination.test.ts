// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";

import { alignPagination } from "./pagination";

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.innerHTML = "";
});

test("stacks pagination when either side is too wide, including a late shuffle button", async () => {
	const callbacks: ResizeObserverCallback[] = [];
	const observe = vi.fn();
	vi.stubGlobal(
		"ResizeObserver",
		class {
			constructor(callback: ResizeObserverCallback) {
				callbacks.push(callback);
			}
			observe = observe;
		},
	);
	document.body.innerHTML = `<div id="row"><span class="navspan"></span><div class="ebr-collection-page-size-host"></div></div>`;
	const row = document.querySelector<HTMLElement>("#row")!;
	const navigation = row.querySelector<HTMLElement>(".navspan")!;
	const controls = row.querySelector<HTMLElement>(
		".ebr-collection-page-size-host",
	)!;
	Object.defineProperty(row, "clientWidth", { value: 500 });
	Object.defineProperty(navigation, "scrollWidth", { value: 100 });
	Object.defineProperty(controls, "scrollWidth", { value: 100 });
	alignPagination(row, navigation);
	expect(row.classList.contains("ebr-collection-pagination-stacked")).toBe(
		false,
	);

	const shuffle = document.createElement("div");
	shuffle.className = "ebr-wishlist-shuffle-controls";
	Object.defineProperty(shuffle, "scrollWidth", { value: 200 });
	row.append(shuffle);
	await vi.waitFor(() => {
		expect(observe).toHaveBeenCalledWith(shuffle);
		expect(row.classList.contains("ebr-collection-pagination-stacked")).toBe(
			true,
		);
	});
	expect(callbacks).toHaveLength(1);
});

test("stacks controls on a single-page wishlist when they do not fit", () => {
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe = vi.fn();
		},
	);
	document.body.innerHTML = `<div id="row"><div class="ebr-wishlist-shuffle-controls"></div><div class="ebr-collection-page-size-host"></div></div>`;
	const row = document.querySelector<HTMLElement>("#row")!;
	const controls = row.querySelector<HTMLElement>(
		".ebr-collection-page-size-host",
	)!;
	const shuffle = row.querySelector<HTMLElement>(
		".ebr-wishlist-shuffle-controls",
	)!;
	Object.defineProperty(row, "clientWidth", { value: 300 });
	Object.defineProperty(controls, "scrollWidth", { value: 200 });
	Object.defineProperty(shuffle, "scrollWidth", { value: 120 });
	alignPagination(row);
	expect(row.classList.contains("ebr-collection-pagination-stacked")).toBe(
		true,
	);
});
