// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { main } from "./app";

let unmount: () => void;

function press(
	target: EventTarget = document.body,
	options: KeyboardEventInit = {},
): KeyboardEvent {
	const event = new KeyboardEvent("keydown", {
		key: "/",
		bubbles: true,
		cancelable: true,
		...options,
	});
	target.dispatchEvent(event);
	return event;
}

function searchInput(): HTMLInputElement {
	const input = document.querySelector<HTMLInputElement>(
		"#ui_search_input_main_search",
	);
	if (!input) throw new Error("Missing search input");
	return input;
}

beforeEach(() => {
	document.body.innerHTML =
		'<input id="ui_search_input_main_search" value="existing query">';
	unmount = main();
});

afterEach(() => {
	unmount();
});

describe("focus search shortcut", () => {
	it("focuses search and invokes its native opening handler without changing the query", () => {
		const input = searchInput();
		const openSearch = vi.fn();
		input.addEventListener("focus", openSearch);

		const event = press();

		expect(document.activeElement).toBe(input);
		expect(openSearch).toHaveBeenCalledOnce();
		expect(input.value).toBe("existing query");
		expect(event.defaultPrevented).toBe(true);
	});

	it("supports keyboard layouts that require Shift to type /", () => {
		expect(press(document.body, { shiftKey: true }).defaultPrevented).toBe(
			true,
		);
		expect(document.activeElement).toBe(searchInput());
	});

	it.each([
		"<input>",
		"<textarea></textarea>",
		"<select><option>Option</option></select>",
		'<div contenteditable="true" tabindex="0"><span>Editor</span></div>',
		'<div contenteditable=""><span>Editor</span></div>',
		'<div contenteditable="plaintext-only"><span>Editor</span></div>',
		'<div role="textbox" tabindex="0"><span>Editor</span></div>',
	])("does not interrupt typing in %s", (markup) => {
		const container = document.createElement("div");
		container.innerHTML = markup;
		document.body.append(container);
		const editor = container.firstElementChild;
		if (!(editor instanceof HTMLElement)) throw new Error("Missing editor");
		editor.focus();

		const event = press(editor.firstElementChild ?? editor);

		expect(document.activeElement).not.toBe(searchInput());
		expect(event.defaultPrevented).toBe(false);
	});

	it("allows normal / characters while already typing in search", () => {
		const input = searchInput();
		input.focus();

		expect(press(input).defaultPrevented).toBe(false);
		expect(document.activeElement).toBe(input);
	});

	it.each<KeyboardEventInit>([
		{ key: "?" },
		{ key: "a" },
		{ ctrlKey: true },
		{ altKey: true },
		{ metaKey: true },
		{ isComposing: true },
		{ repeat: true },
	])("ignores other keys and modified events: %o", (options) => {
		expect(press(document.body, options).defaultPrevented).toBe(false);
		expect(document.activeElement).not.toBe(searchInput());
	});

	it("respects events already handled by the page", () => {
		document.body.addEventListener(
			"keydown",
			(event) => event.preventDefault(),
			{ once: true },
		);

		press();

		expect(document.activeElement).not.toBe(searchInput());
	});

	it("does not consume / on pages without search", () => {
		document.body.innerHTML = "";

		expect(press().defaultPrevented).toBe(false);
	});

	it("does not consume / when search is disabled", () => {
		searchInput().disabled = true;

		expect(press().defaultPrevented).toBe(false);
	});

	it("finds search even when the header is inserted after initialization", () => {
		document.body.innerHTML = "";
		document.body.innerHTML = '<input id="ui_search_input_main_search">';

		press();

		expect(document.activeElement).toBe(searchInput());
	});

	it("can remove its keyboard listener", () => {
		unmount();

		expect(press().defaultPrevented).toBe(false);
		expect(document.activeElement).not.toBe(searchInput());
	});
});
