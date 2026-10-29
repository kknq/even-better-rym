// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";

import { extractShowMarkersFromDOM, openPastShows } from "./show";

afterEach(() => {
	document.body.innerHTML = "";
	vi.useRealTimers();
	vi.restoreAllMocks();
});

function addVisiblePastShowsButton(onClick: () => void): HTMLElement {
	const button = document.createElement("div");
	button.id = "disco_expand_prev";
	Object.defineProperty(button, "offsetParent", {
		configurable: true,
		get: () => document.body,
	});
	button.addEventListener("click", onClick);
	document.querySelector(".section_artist_shows")?.prepend(button);
	return button;
}

describe("extractShowMarkersFromDOM", () => {
	test("does not expand when past shows are already rendered", async () => {
		document.body.innerHTML = `
			<div class="section_artist_shows">
				<ul class="shows">
					<li class="show_list">
						<span style="width: 10em">12 March 2020</span>
						<span>Venue @ Norwich</span>
					</li>
				</ul>
			</div>
		`;
		let clickCount = 0;
		addVisiblePastShowsButton(() => {
			clickCount++;
		});

		const markers = await extractShowMarkersFromDOM(null);

		expect(clickCount).toBe(0);
		expect(markers).toHaveLength(1);
		expect(markers[0].title).toBe("Venue @ Norwich");
		expect(markers[0].year).toBeGreaterThan(2020);
		expect(markers[0].year).toBeLessThan(2021);
	});

	test("expands when there are no rendered past shows", async () => {
		document.body.innerHTML = `
			<div class="section_artist_shows">
				<ul class="shows">
					<li id="no_shows" class="show_list">No upcoming shows</li>
				</ul>
			</div>
		`;

		const button = addVisiblePastShowsButton(() => {
			const list = document.querySelector(".section_artist_shows ul.shows");
			list?.replaceChildren(
				Object.assign(document.createElement("li"), {
					innerHTML:
						'<span style="width: 10em">12 March 2020</span><span>Venue @ Norwich</span>',
				}),
			);
			button.remove();
		});

		const markers = await extractShowMarkersFromDOM(null);

		expect(markers).toHaveLength(1);
		expect(markers[0].title).toBe("Venue @ Norwich");
	});

	test("returns without loading when no expansion button is available", async () => {
		document.body.innerHTML = `
			<div class="section_artist_shows">
				<ul class="shows">
					<li id="no_shows" class="show_list">No upcoming shows</li>
				</ul>
			</div>
		`;
		await expect(extractShowMarkersFromDOM(null)).resolves.toEqual([]);
	});
});

describe("openPastShows", () => {
	test("does not wait when there is no shows section", async () => {
		vi.useFakeTimers();
		await openPastShows();
		expect(vi.getTimerCount()).toBe(0);
	});

	test("does not click a hidden expansion button", async () => {
		document.body.innerHTML =
			'<div class="section_artist_shows"><ul class="shows"></ul></div>';
		const click = vi.fn();
		const button = addVisiblePastShowsButton(click);
		Object.defineProperty(button, "offsetParent", { value: null });
		await openPastShows();
		expect(click).not.toHaveBeenCalled();
	});

	test("resolves when an asynchronous load replaces a placeholder without increasing the item count", async () => {
		document.body.innerHTML =
			'<div class="section_artist_shows"><ul class="shows"><li>No upcoming shows</li></ul></div>';
		addVisiblePastShowsButton(() => {
			queueMicrotask(() => {
				const list = document.querySelector(".shows");
				if (list) {
					list.innerHTML =
						"<li><span>12 March 2020</span><span>Venue @ Norwich</span></li>";
				}
			});
		});
		await expect(openPastShows()).resolves.toBeUndefined();
	});

	test("observes synchronous loads even when the button stays visible", async () => {
		document.body.innerHTML =
			'<div class="section_artist_shows"><ul class="shows"></ul></div>';
		addVisiblePastShowsButton(() => {
			const list = document.querySelector(".shows");
			if (list) {
				list.innerHTML =
					"<li><span>12 March 2020</span><span>Venue @ Norwich</span></li>";
			}
		});
		await expect(extractShowMarkersFromDOM(null)).resolves.toHaveLength(1);
	});

	test("times out and disconnects the observer when the loader never responds", async () => {
		vi.useFakeTimers();
		document.body.innerHTML =
			'<div class="section_artist_shows"><ul class="shows"></ul></div>';
		const click = vi.fn();
		addVisiblePastShowsButton(click);
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
		const loaded = vi.fn();
		const pending = openPastShows(100).then(loaded);
		await vi.advanceTimersByTimeAsync(99);
		expect(loaded).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		await pending;
		expect(click).toHaveBeenCalledOnce();
		expect(loaded).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith(
			"[timeline] Timed out waiting for past shows to load",
		);
		expect(disconnect).toHaveBeenCalledOnce();
		expect(vi.getTimerCount()).toBe(0);
	});

	test("clears the timeout when the expansion button is removed", async () => {
		vi.useFakeTimers();
		document.body.innerHTML =
			'<div class="section_artist_shows"><ul class="shows"></ul></div>';
		const button = addVisiblePastShowsButton(() => {
			queueMicrotask(() => button.remove());
		});
		const pending = openPastShows(100);
		await vi.advanceTimersByTimeAsync(0);
		await pending;
		expect(vi.getTimerCount()).toBe(0);
	});
});
