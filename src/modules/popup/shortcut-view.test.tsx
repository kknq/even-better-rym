// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	CHART_SHORTCUT_ACTIONS,
	CHART_SHORTCUT_GROUP_LABELS,
} from "~/shared/chart-shortcuts/actions";
import type { ChartShortcutBindings } from "~/shared/chart-shortcuts/binding";
import {
	formatCombo,
	resolveDefaultBindings,
} from "~/shared/chart-shortcuts/binding";
import {
	defaultBindings,
	getChartShortcutBindings,
	setChartShortcutBindings,
} from "~/shared/chart-shortcuts/settings";
import { ShortcutView } from "./shortcut-view";

vi.mock("~/shared/chart-shortcuts/settings", () => ({
	defaultBindings: vi.fn(),
	getChartShortcutBindings: vi.fn(),
	setChartShortcutBindings: vi.fn(),
}));

let container: HTMLDivElement;
let savedBindings: ChartShortcutBindings;
let defaults: ChartShortcutBindings;
const onSettingsChange = vi.fn<() => void>();

function deferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	const promise = new Promise<T>((fulfill) => {
		resolve = fulfill;
	});
	return { promise, resolve };
}

beforeEach(() => {
	vi.resetAllMocks();
	defaults = Object.fromEntries(
		CHART_SHORTCUT_ACTIONS.map((action) => [
			action.id,
			resolveDefaultBindings(action.defaultBindings),
		]),
	) as ChartShortcutBindings;
	savedBindings = {
		...defaults,
		includeGenre: ["ctrl+KeyB", "meta+KeyB"],
		includeInfluence: ["alt+KeyJ"],
		includeDescriptor: [],
	};
	vi.mocked(defaultBindings).mockReturnValue(defaults);
	vi.mocked(getChartShortcutBindings).mockResolvedValue(savedBindings);
	vi.mocked(setChartShortcutBindings).mockResolvedValue(undefined);
	container = document.createElement("div");
	document.body.appendChild(container);
});

afterEach(async () => {
	await act(() => render(null, container));
	container.remove();
});

async function showView() {
	await act(() =>
		render(<ShortcutView onSettingsChange={onSettingsChange} />, container),
	);
}

async function waitForLoaded() {
	await vi.waitFor(() => {
		expect(container.querySelector("main")).not.toBeNull();
	});
}

function actionRow(label: string) {
	const labelElement = [...container.querySelectorAll("span")].find(
		(element) => element.textContent === label,
	);
	expect(labelElement).toBeDefined();
	return labelElement!.parentElement!;
}

function buttonWithin(element: Element, text: string) {
	const button = [...element.querySelectorAll("button")].find(
		(candidate) => candidate.textContent === text,
	);
	expect(button).toBeDefined();
	return button!;
}

async function capture(
	row: HTMLElement,
	code: string,
	modifier: "ctrlKey" | "altKey" = "ctrlKey",
) {
	await act(() => buttonWithin(row, "+").click());
	await act(() => {
		row.querySelector("input")!.dispatchEvent(
			new KeyboardEvent("keydown", {
				code,
				[modifier]: true,
				bubbles: true,
				cancelable: true,
			}),
		);
	});
}

function removalLabels(row: HTMLElement) {
	return [...row.querySelectorAll("button[aria-label]")].map((button) =>
		button.getAttribute("aria-label"),
	);
}

describe("ShortcutView", () => {
	test("shows loading until settings resolve, then renders stored bindings", async () => {
		const loading = deferred<ChartShortcutBindings>();
		vi.mocked(getChartShortcutBindings).mockReturnValue(loading.promise);

		await showView();

		expect(container.textContent).toBe("Loading…");
		expect(container.querySelector("button")).toBeNull();
		expect(getChartShortcutBindings).toHaveBeenCalledTimes(1);

		await act(() => loading.resolve(savedBindings));
		await waitForLoaded();

		expect(container.textContent).not.toContain("Loading…");
		expect(removalLabels(actionRow("Include genre"))).toEqual([
			`Remove ${formatCombo("ctrl+KeyB")}`,
			`Remove ${formatCombo("meta+KeyB")}`,
		]);
		expect(removalLabels(actionRow("Include descriptor"))).toEqual([]);
		for (const action of CHART_SHORTCUT_ACTIONS) {
			expect(buttonWithin(actionRow(action.label), "+")).toBeDefined();
		}
		for (const label of Object.values(CHART_SHORTCUT_GROUP_LABELS)) {
			expect(container.textContent).toContain(label);
		}
		expect(defaultBindings).not.toHaveBeenCalled();
		expect(setChartShortcutBindings).not.toHaveBeenCalled();
		expect(onSettingsChange).not.toHaveBeenCalled();
	});

	test("adds a binding optimistically and notifies only after persistence finishes", async () => {
		const persistence = deferred<void>();
		vi.mocked(setChartShortcutBindings).mockReturnValue(persistence.promise);
		await showView();
		await waitForLoaded();
		const row = actionRow("Include genre");

		await capture(row, "KeyK");

		const expected = {
			...savedBindings,
			includeGenre: ["ctrl+KeyB", "meta+KeyB", "ctrl+KeyK"],
		};
		expect(setChartShortcutBindings).toHaveBeenCalledExactlyOnceWith(expected);
		expect(removalLabels(row)).toContain(`Remove ${formatCombo("ctrl+KeyK")}`);
		expect(row.querySelector("input")).toBeNull();
		expect(onSettingsChange).not.toHaveBeenCalled();
		expect(savedBindings.includeGenre).toEqual(["ctrl+KeyB", "meta+KeyB"]);

		await act(() => persistence.resolve(undefined));
		await vi.waitFor(() => expect(onSettingsChange).toHaveBeenCalledTimes(1));
		expect(
			vi.mocked(setChartShortcutBindings).mock.invocationCallOrder[0],
		).toBeLessThan(onSettingsChange.mock.invocationCallOrder[0]);
	});

	test("removes only the selected binding and persists the remaining settings", async () => {
		const persistence = deferred<void>();
		vi.mocked(setChartShortcutBindings).mockReturnValue(persistence.promise);
		await showView();
		await waitForLoaded();
		const row = actionRow("Include genre");
		const remove = row.querySelector<HTMLButtonElement>("button[aria-label]")!;

		await act(() => remove.click());

		expect(removalLabels(row)).toEqual([`Remove ${formatCombo("meta+KeyB")}`]);
		expect(setChartShortcutBindings).toHaveBeenCalledExactlyOnceWith({
			...savedBindings,
			includeGenre: ["meta+KeyB"],
		});
		expect(onSettingsChange).not.toHaveBeenCalled();

		await act(() => persistence.resolve(undefined));
		await vi.waitFor(() => expect(onSettingsChange).toHaveBeenCalledTimes(1));
	});

	test.each([
		["KeyB", "ctrlKey", "Already added to this shortcut"],
		["KeyJ", "altKey", 'Already used by "Include genre as influence"'],
	] as const)("rejects duplicate or conflicting %s without saving", async (code, modifier, message) => {
		await showView();
		await waitForLoaded();
		const row = actionRow("Include genre");

		await capture(row, code, modifier);

		expect(row.textContent).toContain(message);
		expect(row.querySelector("input")).not.toBeNull();
		expect(removalLabels(row)).toHaveLength(2);
		expect(setChartShortcutBindings).not.toHaveBeenCalled();
		expect(onSettingsChange).not.toHaveBeenCalled();
	});

	test("can add a binding to an action with no bindings", async () => {
		await showView();
		await waitForLoaded();
		const row = actionRow("Include descriptor");

		await capture(row, "KeyK");

		expect(removalLabels(row)).toEqual([`Remove ${formatCombo("ctrl+KeyK")}`]);
		expect(setChartShortcutBindings).toHaveBeenCalledExactlyOnceWith({
			...savedBindings,
			includeDescriptor: ["ctrl+KeyK"],
		});
		await vi.waitFor(() => expect(onSettingsChange).toHaveBeenCalledTimes(1));
	});

	test("resets every action to defaults and waits for persistence before notifying", async () => {
		const persistence = deferred<void>();
		vi.mocked(setChartShortcutBindings).mockReturnValue(persistence.promise);
		await showView();
		await waitForLoaded();

		await act(() => buttonWithin(container, "Reset all to defaults").click());

		expect(defaultBindings).toHaveBeenCalledTimes(1);
		expect(setChartShortcutBindings).toHaveBeenCalledExactlyOnceWith(defaults);
		for (const action of CHART_SHORTCUT_ACTIONS) {
			expect(removalLabels(actionRow(action.label))).toEqual(
				defaults[action.id].map((combo) => `Remove ${formatCombo(combo)}`),
			);
		}
		expect(onSettingsChange).not.toHaveBeenCalled();

		await act(() => persistence.resolve(undefined));
		await vi.waitFor(() => expect(onSettingsChange).toHaveBeenCalledTimes(1));
	});
});
