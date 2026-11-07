// @vitest-environment jsdom

import { beforeEach, expect, test, vi } from "vitest";
import { loadSection } from "~/shared/artist-discography";
import { extractDiscographyMarkersFromDOM } from "./discography";

vi.mock("~/shared/artist-discography", async (importOriginal) => ({
	...(await importOriginal<typeof import("~/shared/artist-discography")>()),
	loadSection: vi.fn(),
}));
vi.mock("~/shared/utils/messaging", () => ({
	sendBackgroundMessage: vi.fn(),
}));
vi.mock("~/shared/utils/storage", () => ({ get: vi.fn(), set: vi.fn() }));

function row(id: number, title: string, year: number) {
	return `<div class="disco_release" id="release_${id}">
		<div class="disco_mainline"><a>${title}</a></div>
		<span class="disco_year_y">${year}</span></div>`;
}

beforeEach(() => {
	vi.resetAllMocks();
	document.body.innerHTML = `<div id="discography">
		<span id="disco_header_showing_s">Showing 1 of 2</span>
		<div id="disco_type_s">${row(1, "First", 2000)}</div></div>`;
});

test("includes unloaded releases using the shared loader without expanding the DOM", async () => {
	const before = document.body.innerHTML;
	vi.mocked(loadSection).mockResolvedValue(
		new DOMParser().parseFromString(
			row(1, "First", 2000) + row(2, "Hidden", 2005),
			"text/html",
		),
	);
	const markers = await extractDiscographyMarkersFromDOM(null);
	expect(markers.album.map((marker) => marker.title)).toEqual([
		"First",
		"Hidden",
	]);
	expect(loadSection).toHaveBeenCalledWith("s");
	expect(document.body.innerHTML).toBe(before);
});

test("does not fetch fully loaded sections and preserves the disbanded-year cutoff", async () => {
	document
		.querySelector("#disco_type_s")
		?.insertAdjacentHTML("beforeend", row(2, "Later", 2005));
	const markers = await extractDiscographyMarkersFromDOM(2001);
	expect(markers.album.map((marker) => marker.title)).toEqual(["First"]);
	expect(loadSection).not.toHaveBeenCalled();
});

test("surfaces loading failures instead of returning incomplete markers", async () => {
	document.querySelector("#discography")?.insertAdjacentHTML(
		"beforeend",
		`<span id="disco_header_showing_e">Showing 1 of 2</span>
		<div id="disco_type_e">${row(3, "EP", 2003)}</div>`,
	);
	vi.mocked(loadSection).mockRejectedValue(new Error("Offline"));
	await expect(extractDiscographyMarkersFromDOM(null)).rejects.toThrow(
		"Offline",
	);
	expect(loadSection).toHaveBeenCalledExactlyOnceWith("s");
});

test("finishes each section before loading the next", async () => {
	document.querySelector("#discography")?.insertAdjacentHTML(
		"beforeend",
		`<span id="disco_header_showing_e">Showing 1 of 2</span>
		<div id="disco_type_e">${row(3, "EP", 2003)}</div>`,
	);
	let finish: ((document: Document) => void) | undefined;
	vi.mocked(loadSection).mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	vi.mocked(loadSection).mockResolvedValue(
		new DOMParser().parseFromString(
			row(3, "EP", 2003) + row(4, "Hidden EP", 2004),
			"text/html",
		),
	);
	const pending = extractDiscographyMarkersFromDOM(null);
	await vi.waitFor(() => {
		expect(loadSection).toHaveBeenCalledExactlyOnceWith("s");
	});
	finish?.(
		new DOMParser().parseFromString(
			row(1, "First", 2000) + row(2, "Hidden", 2005),
			"text/html",
		),
	);
	const markers = await pending;
	expect(vi.mocked(loadSection).mock.calls.map(([type]) => type)).toEqual([
		"s",
		"e",
	]);
	expect(markers.album).toHaveLength(2);
	expect(markers.ep.map((marker) => marker.title)).toEqual(["EP", "Hidden EP"]);
});
