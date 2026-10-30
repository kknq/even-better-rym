// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	defaultReferenceLinkSettings,
	getReferenceLinkSettings,
	setReferenceLinkSettings,
} from "~/shared/reference-links/settings";
import { ReferenceLinksView } from "./reference-links-view";

vi.mock("~/shared/reference-links/settings", () => ({
	defaultReferenceLinkSettings: { buttonColor: "#60758a" },
	getReferenceLinkSettings: vi.fn(),
	setReferenceLinkSettings: vi.fn(),
}));

const onSettingsChange = vi.fn();
let container: HTMLDivElement;

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(getReferenceLinkSettings).mockResolvedValue({
		buttonColor: "#60758a",
	});
	vi.mocked(setReferenceLinkSettings).mockResolvedValue();
	container = document.createElement("div");
	document.body.appendChild(container);
});

afterEach(async () => {
	await act(() => render(null, container));
	container.remove();
});

describe("ReferenceLinksView", () => {
	test("loads current colors and persists picker changes", async () => {
		await act(() =>
			render(
				<ReferenceLinksView onSettingsChange={onSettingsChange} />,
				container,
			),
		);
		await vi.waitFor(() => {
			expect(container.querySelectorAll('input[type="color"]')).toHaveLength(1);
		});

		const color = container.querySelector<HTMLInputElement>(
			'[aria-label="Reference link button color"]',
		);
		expect(color?.value).toBe("#60758a");

		await act(() => {
			if (!color) throw new Error("Missing reference link color input");
			color.value = "#445566";
			color.dispatchEvent(new Event("change", { bubbles: true }));
		});

		await vi.waitFor(() => {
			expect(setReferenceLinkSettings).toHaveBeenCalledWith({
				buttonColor: "#445566",
			});
		});
		await vi.waitFor(() => expect(onSettingsChange).toHaveBeenCalledOnce());
	});

	test("resets the shared button color to its default", async () => {
		vi.mocked(getReferenceLinkSettings).mockResolvedValue({
			buttonColor: "#123456",
		});
		await act(() =>
			render(
				<ReferenceLinksView onSettingsChange={onSettingsChange} />,
				container,
			),
		);
		await vi.waitFor(() => {
			expect(
				container.querySelector('[aria-label="Reference link button color"]'),
			).not.toBeNull();
		});

		const resetButton = [...container.querySelectorAll("button")].find(
			(button) => button.textContent?.includes("Reset button color"),
		);
		await act(() => resetButton?.click());
		await vi.waitFor(() => {
			expect(setReferenceLinkSettings).toHaveBeenCalledWith(
				defaultReferenceLinkSettings,
			);
		});
		expect(onSettingsChange).toHaveBeenCalledOnce();
	});
});
