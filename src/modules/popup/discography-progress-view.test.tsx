// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
	getSelectedTypes,
	setSelectedTypes,
} from "~/shared/discography-progress/settings";
import { releaseTypes } from "~/shared/release-types";
import { DiscographyProgressView } from "./discography-progress-view";

vi.mock("~/shared/discography-progress/settings", () => ({
	getSelectedTypes: vi.fn(),
	setSelectedTypes: vi.fn(),
}));

let container: HTMLDivElement;

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(getSelectedTypes).mockResolvedValue(new Set(["s", "e", "m"]));
	vi.mocked(setSelectedTypes).mockResolvedValue();
	container = document.createElement("div");
	document.body.append(container);
});

afterEach(async () => {
	await act(() => render(null, container));
	container.remove();
	vi.restoreAllMocks();
});

function checkbox(label: string): HTMLInputElement {
	const input = [...container.querySelectorAll("label")]
		.find((element) => element.textContent === label)
		?.querySelector("input");
	if (!input) throw new Error(`Missing checkbox: ${label}`);
	return input;
}

async function showSettings() {
	await act(() => render(<DiscographyProgressView />, container));
	await vi.waitFor(() => {
		expect(container.querySelectorAll("input")).toHaveLength(
			Object.keys(releaseTypes).length,
		);
	});
}

test("shows all release types with only albums, EPs and mixtapes selected by default", async () => {
	await showSettings();
	expect(container.querySelector("main")?.lang).toBe("en");
	const checked = [...container.querySelectorAll("label")]
		.filter((label) => label.querySelector("input")?.checked)
		.map((label) => label.textContent);
	expect(checked).toEqual(["Albums", "Mixtapes", "EPs"]);
	expect(checkbox("DJ mixes").checked).toBe(false);
	expect(checkbox("Singles").checked).toBe(false);
});

test("shows loading content until settings are available", async () => {
	const pending = Promise.withResolvers<Set<keyof typeof releaseTypes>>();
	vi.mocked(getSelectedTypes).mockReturnValueOnce(pending.promise);
	await act(() => render(<DiscographyProgressView />, container));
	expect(container.textContent).toContain("Loading...");
	expect(container.querySelector("input")).toBeNull();
	expect(container.querySelector("button")).toBeNull();
	await act(() => pending.resolve(new Set(["s", "e", "m"])));
	await vi.waitFor(() => {
		expect(checkbox("Albums").checked).toBe(true);
	});
	expect(container.textContent).not.toContain("Loading...");
});

test("saves selections and restores them when reopening settings", async () => {
	await showSettings();
	await act(() => checkbox("DJ mixes").click());
	await vi.waitFor(() => {
		expect(setSelectedTypes).toHaveBeenCalledWith(
			new Set(["s", "e", "m", "j"]),
		);
		expect(checkbox("DJ mixes").checked).toBe(true);
	});
	vi.mocked(getSelectedTypes).mockResolvedValue(new Set(["j"]));
	await act(() => render(null, container));
	await showSettings();
	expect(checkbox("DJ mixes").checked).toBe(true);
	expect(checkbox("Albums").checked).toBe(false);
});

test("allows all release types to be excluded", async () => {
	vi.mocked(getSelectedTypes).mockResolvedValue(new Set(["s"]));
	await showSettings();
	await act(() => checkbox("Albums").click());
	await vi.waitFor(() => {
		expect(setSelectedTypes).toHaveBeenCalledWith(new Set());
	});
	expect(container.querySelectorAll("input:checked")).toHaveLength(0);
});

test("disables controls while saving to avoid overwriting concurrent changes", async () => {
	const saved = Promise.withResolvers<void>();
	vi.mocked(setSelectedTypes).mockReturnValueOnce(saved.promise);
	await showSettings();
	await act(() => checkbox("Singles").click());
	expect(
		[...container.querySelectorAll("input")].every((input) => input.disabled),
	).toBe(true);
	await act(() => saved.resolve());
	await vi.waitFor(() => {
		expect(checkbox("Singles").checked).toBe(true);
		expect(checkbox("Singles").disabled).toBe(false);
	});
});

test("reports failed writes, preserves saved choices and allows retry", async () => {
	const log = vi.spyOn(console, "error").mockReturnValue(undefined);
	vi.mocked(setSelectedTypes).mockRejectedValueOnce(
		new Error("Storage failed"),
	);
	await showSettings();
	await act(() => checkbox("Singles").click());
	await vi.waitFor(() => {
		expect(container.querySelector('[role="alert"]')?.textContent).toContain(
			"Could not save release types",
		);
	});
	expect(checkbox("Singles").checked).toBe(false);
	await act(() => checkbox("Singles").click());
	await vi.waitFor(() => {
		expect(checkbox("Singles").checked).toBe(true);
	});
	expect(container.querySelector('[role="alert"]')).toBeNull();
	expect(log).toHaveBeenCalled();
});

test("reports failed reads and offers a retry instead of using false defaults", async () => {
	const log = vi.spyOn(console, "error").mockReturnValue(undefined);
	vi.mocked(getSelectedTypes).mockRejectedValueOnce(
		new Error("Storage failed"),
	);
	await act(() => render(<DiscographyProgressView />, container));
	await vi.waitFor(() => {
		expect(container.querySelector('[role="alert"]')?.textContent).toContain(
			"Could not load discography settings",
		);
	});
	expect(container.querySelector("input")).toBeNull();
	await act(() => container.querySelector("button")?.click());
	await vi.waitFor(() => {
		expect(checkbox("Albums").checked).toBe(true);
	});
	expect(log).toHaveBeenCalled();
});
