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
	expect(buttons.some((button) => button.title === "NTS")).toBe(true);
	expect(buttons.some((button) => button.title === "Mixcloud")).toBe(true);
	expect(buttons.some((button) => button.title === "Deezer")).toBe(true);
	expect(buttons.some((button) => button.title === "Tidal")).toBe(true);
	expect(buttons.some((button) => button.title === "Qobuz")).toBe(true);
	expect(buttons[0].parentElement?.style.flexWrap).toBe("wrap");
	expect(buttons.every((button) => button.style.flexShrink === "0")).toBe(true);
});

test.each([
	["https://www.traxsource.com/title/123/example", "traxsource"],
	[
		"https://www.nts.live/shows/guests/episodes/yhwh-nailgun-13th-august-2025",
		"nts",
	],
	["https://www.mixcloud.com/huerco_s/eargasmlodgemix/", "mixcloud"],
	["https://www.deezer.com/en/album/302127", "deezer"],
	["https://tidal.com/browse/album/251380836", "tidal"],
	["https://open.qobuz.com/album/0724384960650", "qobuz"],
])("automatically selects the import service for %s", async (url, id) => {
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
	expect(onSubmit).toHaveBeenCalledWith(url, expect.objectContaining({ id }));
});
