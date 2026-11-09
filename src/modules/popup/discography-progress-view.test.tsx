// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
	getHideZeroCoverage,
	getSelectedTypes,
	setHideZeroCoverage,
	setSelectedTypes,
} from "~/shared/discography-progress/settings";
import { releaseTypes } from "~/shared/release-types";
import { DiscographyProgressView } from "./discography-progress-view";

vi.mock("~/shared/discography-progress/settings", () => ({
	getHideZeroCoverage: vi.fn(),
	getSelectedTypes: vi.fn(),
	setHideZeroCoverage: vi.fn(),
	setSelectedTypes: vi.fn(),
}));

let container: HTMLDivElement;

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(getSelectedTypes).mockResolvedValue(new Set(["s", "e", "m"]));
	vi.mocked(getHideZeroCoverage).mockResolvedValue(false);
	vi.mocked(setHideZeroCoverage).mockResolvedValue();
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
			Object.keys(releaseTypes).length + 1,
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
	expect(
		checkbox("Hide overall discography coverage when it is zero").checked,
	).toBe(false);
});

test("saves and restores the zero-coverage visibility toggle independently of release types", async () => {
	const label = "Hide overall discography coverage when it is zero";
	await showSettings();
	await act(() => checkbox(label).click());
	await vi.waitFor(() => {
		expect(checkbox(label).checked).toBe(true);
	});
	expect(setHideZeroCoverage).toHaveBeenCalledExactlyOnceWith(true);
	expect(setSelectedTypes).not.toHaveBeenCalled();
	vi.mocked(getHideZeroCoverage).mockResolvedValue(true);
	await act(() => render(null, container));
	await showSettings();
	expect(checkbox(label).checked).toBe(true);
	await act(() => checkbox(label).click());
	await vi.waitFor(() => {
		expect(checkbox(label).checked).toBe(false);
	});
	expect(setHideZeroCoverage).toHaveBeenLastCalledWith(false);
});

test("locks all controls during visibility saves and preserves the previous choice on failure", async () => {
	const log = vi.spyOn(console, "error").mockReturnValue(undefined);
	const pending = Promise.withResolvers<void>();
	const label = "Hide overall discography coverage when it is zero";
	vi.mocked(setHideZeroCoverage).mockReturnValueOnce(pending.promise);
	await showSettings();
	await act(() => checkbox(label).click());
	expect(
		[...container.querySelectorAll("input")].every((input) => input.disabled),
	).toBe(true);
	await act(() => pending.reject(new Error("Storage failed")));
	await vi.waitFor(() => {
		expect(container.querySelector('[role="alert"]')?.textContent).toContain(
			"Could not save coverage visibility",
		);
	});
	expect(checkbox(label).checked).toBe(false);
	expect(checkbox(label).disabled).toBe(false);
	expect(log).toHaveBeenCalled();
	await act(() => checkbox(label).click());
	await vi.waitFor(() => {
		expect(checkbox(label).checked).toBe(true);
	});
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

test("reports visibility read failures rather than showing an unsaved default", async () => {
	const log = vi.spyOn(console, "error").mockReturnValue(undefined);
	vi.mocked(getHideZeroCoverage).mockRejectedValueOnce(
		new Error("Storage failed"),
	);
	await act(() => render(<DiscographyProgressView />, container));
	await vi.waitFor(() => {
		expect(container.querySelector('[role="alert"]')?.textContent).toContain(
			"Could not load discography settings",
		);
	});
	expect(container.querySelector("input")).toBeNull();
	expect(log).toHaveBeenCalled();
	await act(() => container.querySelector("button")?.click());
	await vi.waitFor(() => {
		expect(
			checkbox("Hide overall discography coverage when it is zero").checked,
		).toBe(false);
	});
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
