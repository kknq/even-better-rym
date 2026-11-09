// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
	getSectionOrder,
	resetSectionOrder,
	setSectionOrder,
} from "~/shared/discography-order/settings";
import { releaseTypes } from "~/shared/release-types";
import { DiscographyOrderView } from "./discography-order-view";

vi.mock("~/shared/discography-order/settings", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("~/shared/discography-order/settings")
	>()),
	getSectionOrder: vi.fn(),
	resetSectionOrder: vi.fn(),
	setSectionOrder: vi.fn(),
}));
vi.mock("webextension-polyfill", () => ({ default: {} }));
vi.mock("~/shared/utils/storage", () => ({}));

const defaultOrder = Object.keys(releaseTypes);
let container: HTMLDivElement;

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(getSectionOrder).mockResolvedValue([
		...(defaultOrder as (keyof typeof releaseTypes)[]),
	]);
	vi.mocked(setSectionOrder).mockResolvedValue();
	vi.mocked(resetSectionOrder).mockResolvedValue();
	container = document.createElement("div");
	document.body.append(container);
});

afterEach(async () => {
	await act(() => render(null, container));
	container.remove();
});

const labels = () =>
	[...container.querySelectorAll("li")].map(
		(item) => item.querySelector("span:not([aria-hidden])")?.textContent,
	);

const button = (label: string) => {
	const element = [...container.querySelectorAll("button")].find(
		(candidate) =>
			candidate.getAttribute("aria-label") === label ||
			candidate.textContent === label,
	);
	if (!element) throw new Error(`Missing button: ${label}`);
	return element;
};

async function showSettings() {
	await act(() => render(<DiscographyOrderView />, container));
	await vi.waitFor(() => {
		expect(container.querySelectorAll("li")).toHaveLength(defaultOrder.length);
	});
}

test("lists sections in the saved order with boundary buttons disabled", async () => {
	await showSettings();
	expect(labels()[0]).toBe("Albums");
	expect(labels().at(-1)).toBe("Additional releases");
	expect(button("Move Albums up").disabled).toBe(true);
	expect(button("Move Additional releases down").disabled).toBe(true);
	expect(button("Reset to RYM order").disabled).toBe(true);
});

test("moves a section and saves the new order", async () => {
	await showSettings();
	await act(() => button("Move Additional releases up").click());
	await vi.waitFor(() => {
		expect(labels().slice(-2)).toEqual(["Additional releases", "Videos"]);
	});
	const saved = vi.mocked(setSectionOrder).mock.calls[0][0];
	expect(saved.slice(-2)).toEqual(["x", "d"]);
	expect(button("Reset to RYM order").disabled).toBe(false);
});

const item = (label: string) => {
	const element = [...container.querySelectorAll("li")].find(
		(candidate) =>
			candidate.querySelector("span:not([aria-hidden])")?.textContent === label,
	);
	if (!element) throw new Error(`Missing item: ${label}`);
	return element;
};

const fire = (element: Element, event: Event) =>
	act(() => {
		element.dispatchEvent(event);
	});

async function drag(from: string, to: string) {
	const source = item(from);
	const target = item(to);
	await fire(source, new Event("dragstart", { bubbles: true }));
	const over = new Event("dragover", { bubbles: true, cancelable: true });
	await fire(target, over);
	expect(over.defaultPrevented).toBe(true);
	await fire(target, new Event("drop", { bubbles: true }));
	await fire(source, new Event("dragend", { bubbles: true }));
}

test("drags a section above another and saves the new order", async () => {
	await showSettings();
	await drag("Additional releases", "Singles");
	await vi.waitFor(() => {
		expect(labels().slice(3, 6)).toEqual([
			"EPs",
			"Additional releases",
			"Singles",
		]);
	});
	expect(vi.mocked(setSectionOrder).mock.calls[0][0].slice(3, 6)).toEqual([
		"e",
		"x",
		"i",
	]);
});

test("drags a section below another", async () => {
	await showSettings();
	await drag("Albums", "Mixtapes");
	await vi.waitFor(() => {
		expect(labels().slice(0, 3)).toEqual(["Live albums", "Mixtapes", "Albums"]);
	});
});

test("ignores drops onto the dragged section and drags from elsewhere", async () => {
	await showSettings();
	await drag("Singles", "Singles");
	const over = new Event("dragover", { bubbles: true, cancelable: true });
	await fire(item("EPs"), over);
	expect(over.defaultPrevented).toBe(false);
	expect(setSectionOrder).not.toHaveBeenCalled();
});

test("resets to the RYM order", async () => {
	vi.mocked(getSectionOrder).mockResolvedValue([
		"x",
		...(defaultOrder.filter(
			(type) => type !== "x",
		) as (keyof typeof releaseTypes)[]),
	]);
	await showSettings();
	expect(labels()[0]).toBe("Additional releases");
	await act(() => button("Reset to RYM order").click());
	await vi.waitFor(() => {
		expect(labels()[0]).toBe("Albums");
	});
	expect(resetSectionOrder).toHaveBeenCalledOnce();
});

test("shows an error when saving fails", async () => {
	vi.mocked(setSectionOrder).mockRejectedValue(new Error("nope"));
	vi.spyOn(console, "error").mockImplementation(vi.fn());
	await showSettings();
	await act(() => button("Move Albums down").click());
	await vi.waitFor(() => {
		expect(container.querySelector("[role=alert]")?.textContent).toBe(
			"Could not save section order. Please try again.",
		);
	});
	expect(labels()[0]).toBe("Albums");
});
