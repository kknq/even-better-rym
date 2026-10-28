// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, expect, test, vi } from "vitest";

import { RESOLVABLES } from "../services";
import { initial } from "../utils/one-shot";
import { ServiceLinkForm } from "./service-link-form";

vi.mock("webextension-polyfill", () => ({ default: {} }));

afterEach(async () => {
	await act(() => render(null, document.body));
});

test("sizes the URL box to fit every import icon at its full width", async () => {
	await act(() => {
		render(
			<ServiceLinkForm
				data={initial}
				services={RESOLVABLES}
				onSubmit={vi.fn()}
			/>,
			document.body,
		);
	});

	const input = document.querySelector<HTMLInputElement>('input[type="url"]');
	const column = input?.parentElement;
	const buttons = [...document.querySelectorAll("button")];
	const requiredWidth = buttons.length * 32 + (buttons.length - 1) * 4;
	expect(Number.parseInt(column?.style.width ?? "", 10)).toBeGreaterThanOrEqual(
		requiredWidth,
	);
	expect(input?.style.boxSizing).toBe("border-box");
	expect(buttons).toHaveLength(RESOLVABLES.length);
	expect(buttons.some((button) => button.title === "Traxsource")).toBe(true);
	expect(buttons[0].parentElement?.style.flexWrap).toBe("wrap");
	expect(buttons.every((button) => button.style.flexShrink === "0")).toBe(true);
});

test("automatically selects Traxsource when pasting a release URL", async () => {
	const onSubmit = vi.fn();
	await act(() => {
		render(
			<ServiceLinkForm
				data={initial}
				services={RESOLVABLES}
				onSubmit={onSubmit}
			/>,
			document.body,
		);
	});

	const url = "https://www.traxsource.com/title/123/example";
	await act(() => {
		const input = document.querySelector<HTMLInputElement>('input[type="url"]');
		if (!input) throw new Error("Missing URL input");
		input.value = url;
		input.dispatchEvent(new Event("input", { bubbles: true }));
	});
	await act(() => {
		document
			.querySelector("form")
			?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
	});
	expect(onSubmit).toHaveBeenCalledWith(
		url,
		expect.objectContaining({ id: "traxsource" }),
	);
});
