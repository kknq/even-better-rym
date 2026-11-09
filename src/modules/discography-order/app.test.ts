// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	defaultSectionOrder,
	getSectionOrder,
	watchSectionOrder,
} from "~/shared/discography-order/settings";
import type { ReleaseType } from "~/shared/release-types";
import { main, orderSections } from "./app";

vi.mock("~/shared/discography-order/settings", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("~/shared/discography-order/settings")
	>()),
	getSectionOrder: vi.fn(),
	watchSectionOrder: vi.fn(),
}));
vi.mock("webextension-polyfill", () => ({ default: {} }));
vi.mock("~/shared/utils/storage", () => ({}));

function section(type: string, extra = "") {
	return `
		<div class="disco_header_top">
			<h3 class="disco_header_label">${type}</h3>
			<div class="disco_showing"><span id="disco_header_showing_${type}">Showing all</span></div>
		</div>
		<div style="clear:both;"></div>
		<div id="disco_header_${type}" class="disco_header_section"></div>
		<div id="disco_type_${type}"><div class="disco_release">${type} release</div></div>${extra}
		<!-- _@@_discography_section_${type}_@@_ -->`;
}

const render = (types: string[]) =>
	`<div class="intro">intro</div>${types.map((type) => section(type)).join("")}`;

const sectionTypes = () =>
	[...document.querySelectorAll("[id^=disco_type_]")].map((element) =>
		element.id.slice(-1),
	);

const orderWith = (...first: ReleaseType[]) => [
	...first,
	...defaultSectionOrder.filter((type) => !first.includes(type)),
];

beforeEach(() => {
	document.body.innerHTML = `<div id="discography">${render(["s", "e", "i", "x"])}</div>`;
});

describe("orderSections", () => {
	test("moves whole sections, keeping leading content first", () => {
		const root = document.getElementById("discography")!;
		root.querySelector("#disco_type_i")!.after(document.createElement("aside"));

		expect(orderSections(root, orderWith("x"))).toBe(true);

		expect(sectionTypes()).toEqual(["x", "s", "e", "i"]);
		expect(root.firstElementChild?.className).toBe("intro");
		const headers = [...root.querySelectorAll(".disco_header_top")];
		expect(headers[0].nextElementSibling?.nextElementSibling?.id).toBe(
			"disco_header_x",
		);
		// Content between sections stays with the section above it.
		expect(
			root.querySelector("#disco_type_i")?.nextElementSibling?.tagName,
		).toBe("ASIDE");
		const markers = [...root.childNodes]
			.filter((node) => node.nodeType === Node.COMMENT_NODE)
			.map((node) => node.textContent?.trim());
		expect(markers).toEqual([
			"_@@_discography_section_x_@@_",
			"_@@_discography_section_s_@@_",
			"_@@_discography_section_e_@@_",
			"_@@_discography_section_i_@@_",
		]);
	});

	test("does nothing when sections are already in order", () => {
		const root = document.getElementById("discography")!;
		const observer = new MutationObserver(vi.fn());
		observer.observe(root, { childList: true });
		expect(orderSections(root, defaultSectionOrder)).toBe(false);
		expect(observer.takeRecords()).toHaveLength(0);
	});
});

describe("main", () => {
	let onOrderChange: (order: ReleaseType[]) => void;

	beforeEach(() => {
		vi.mocked(getSectionOrder).mockResolvedValue(orderWith("x", "i"));
		vi.mocked(watchSectionOrder).mockImplementation((callback) => {
			onOrderChange = callback;
			return vi.fn();
		});
	});

	afterEach(() => vi.resetAllMocks());

	test("reorders on load, after RYM re-renders and when the setting changes", async () => {
		await main();
		expect(sectionTypes()).toEqual(["x", "i", "s", "e"]);

		document.getElementById("discography")!.innerHTML = render([
			"s",
			"e",
			"i",
			"x",
		]);
		await vi.waitFor(() => {
			expect(sectionTypes()).toEqual(["x", "i", "s", "e"]);
		});

		onOrderChange(defaultSectionOrder);
		expect(sectionTypes()).toEqual(["s", "e", "i", "x"]);
	});

	test("starts inactive at the default order and activates without reloading", async () => {
		vi.mocked(getSectionOrder).mockResolvedValue(defaultSectionOrder);
		const root = document.getElementById("discography")!;
		root.innerHTML = render(["x", "s", "e", "i"]);
		await main();
		expect(sectionTypes()).toEqual(["x", "s", "e", "i"]);

		onOrderChange(orderWith("i", "x"));
		expect(sectionTypes()).toEqual(["i", "x", "s", "e"]);
		onOrderChange(defaultSectionOrder);
		expect(sectionTypes()).toEqual(["s", "e", "i", "x"]);

		root.innerHTML = render(["x", "s", "e", "i"]);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(sectionTypes()).toEqual(["x", "s", "e", "i"]);
	});
});
