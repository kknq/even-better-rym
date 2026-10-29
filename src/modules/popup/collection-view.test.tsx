// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type {
	CollectionKind,
	CollectionSettings,
} from "~/shared/collection/settings";
import { useCollectionSettings } from "~/shared/collection/use-settings";

import { CollectionView } from "./collection-view";

vi.mock("~/shared/collection/use-settings", () => ({
	useCollectionSettings: vi.fn(),
}));
// Real controls import settings, but these tests never access extension storage.
vi.mock("webextension-polyfill", () => ({ default: {} }));

let container: HTMLDivElement;
let settings: CollectionSettings;
const save = vi.fn<(next: CollectionSettings) => Promise<void>>();
const onSettingsChange = vi.fn<() => void>();

beforeEach(() => {
	vi.resetAllMocks();
	settings = {
		filters: {
			search: true,
			status: true,
			rating: true,
			type: true,
			format: false,
			views: false,
		},
		columns: ["aat", "r"],
		columnManagement: true,
		pageSize: 50,
	};
	save.mockResolvedValue(undefined);
	vi.mocked(useCollectionSettings).mockReturnValue({
		settings,
		save,
		error: "",
	});
	container = document.createElement("div");
	document.body.appendChild(container);
});

afterEach(async () => {
	await act(() => render(null, container));
	container.remove();
	vi.restoreAllMocks();
});

async function show(kind: CollectionKind = "music") {
	await act(() => {
		render(
			<CollectionView kind={kind} onSettingsChange={onSettingsChange} />,
			container,
		);
	});
}

function checkbox(label: string) {
	const input = [...container.querySelectorAll("label")]
		.find((element) => element.textContent?.trim() === label)
		?.querySelector("input");
	if (!input) throw new Error(`Missing checkbox: ${label}`);
	return input;
}

function button(text: string) {
	const element = [...container.querySelectorAll("button")].find(
		(element) => element.textContent === text,
	);
	if (!element) throw new Error(`Missing button: ${text}`);
	return element;
}

async function selectPageSize(value: string) {
	const select = container.querySelector<HTMLSelectElement>(
		'select[aria-label="Items per page"]',
	);
	if (!select) throw new Error("Missing page-size select");
	await act(() => {
		select.value = value;
		select.dispatchEvent(new Event("change", { bubbles: true }));
	});
}

async function submitPageSize() {
	const form = container.querySelector("form");
	if (!form) throw new Error("Missing page-size form");
	await act(() => {
		form.dispatchEvent(
			new Event("submit", { bubbles: true, cancelable: true }),
		);
	});
}

describe("CollectionView", () => {
	test("shows loading without controls while settings are unavailable", async () => {
		vi.mocked(useCollectionSettings).mockReturnValue({
			settings: null,
			save,
			error: "",
		});

		await show();

		expect(container.textContent).toBe("Loading...");
		expect(container.querySelector("main")).toBeNull();
		expect(container.querySelector("input, select, button")).toBeNull();
		expect(save).not.toHaveBeenCalled();
	});

	test("shows a loading error instead of loading text or controls", async () => {
		vi.mocked(useCollectionSettings).mockReturnValue({
			settings: null,
			save,
			error: "Could not load settings",
		});

		await show();

		expect(container.textContent).toBe("Could not load settings");
		expect(container.querySelector("main")).toBeNull();
	});

	test("shows an error alongside the available settings", async () => {
		vi.mocked(useCollectionSettings).mockReturnValue({
			settings,
			save,
			error: "Could not save collection settings",
		});

		await show();

		expect(container.querySelector('[role="alert"]')?.textContent).toBe(
			"Could not save collection settings",
		);
		expect(container.querySelector("main")).not.toBeNull();
		expect(checkbox("Search").checked).toBe(true);
		expect(onSettingsChange).not.toHaveBeenCalled();
	});

	test("renders music filters, managed columns and navigation guidance", async () => {
		await show();

		expect(useCollectionSettings).toHaveBeenCalledWith("music");
		expect(container.textContent).toContain("Column and page-size changes");
		expect(container.textContent).toContain(
			"Toggling column management refreshes open music collections immediately.",
		);
		expect(checkbox("Enable column management").checked).toBe(true);
		expect(checkbox("Release type").checked).toBe(true);
		expect(checkbox("Format").checked).toBe(false);
		expect(checkbox("Views").checked).toBe(false);
		expect(container.textContent).toContain("Displayed columns");
		expect(checkbox("Cover art").checked).toBe(true);
		expect(checkbox("Artist").checked).toBe(false);
		expect(button("Restore defaults")).toBeDefined();
		expect(container.querySelector("select")?.value).toBe("50");
	});

	test("hides column settings when music column management is disabled", async () => {
		settings.columnManagement = false;

		await show();

		expect(checkbox("Enable column management").checked).toBe(false);
		expect(container.textContent).toContain("Displayed filters");
		expect(container.textContent).not.toContain("Displayed columns");
		expect(container.textContent).not.toContain("Restore defaults");
		expect(container.textContent).not.toContain("Cover art");
		expect(checkbox("Format")).toBeDefined();
		expect(container.querySelector("form")).not.toBeNull();
	});

	test("renders film page size and supported filters without music controls", async () => {
		// Even a stale enabled flag must not expose music column controls.
		await show("film");

		expect(useCollectionSettings).toHaveBeenCalledWith("film");
		expect(container.textContent).toContain("Page-size changes");
		expect(container.textContent).not.toContain("Column and page-size changes");
		expect(container.textContent).not.toContain("refreshes open music");
		expect(
			[...container.querySelectorAll('input[type="checkbox"]')].map((input) =>
				input.closest("label")?.textContent?.trim(),
			),
		).toEqual(["Search", "Ownership status", "Rating"]);
		expect(container.textContent).not.toContain("Enable column management");
		expect(container.textContent).not.toContain("Displayed columns");
		expect(container.textContent).not.toContain("Restore defaults");
		expect(container.querySelector("form")).not.toBeNull();
	});

	test.each([
		"music",
		"film",
	] as const)("saves %s page size and notifies only after saving completes", async (kind) => {
		let finishSave: () => void = () => undefined;
		save.mockReturnValue(
			new Promise<void>((resolve) => {
				finishSave = resolve;
			}),
		);
		await show(kind);
		await selectPageSize("100");
		await submitPageSize();

		expect(save).toHaveBeenCalledExactlyOnceWith({
			...settings,
			pageSize: 100,
		});
		expect(onSettingsChange).not.toHaveBeenCalled();
		expect(button("Save").disabled).toBe(true);

		await act(() => finishSave());

		await vi.waitFor(() => {
			expect(onSettingsChange).toHaveBeenCalledExactlyOnceWith();
			expect(button("Save").disabled).toBe(false);
		});
	});

	test("shows a caught page-size save failure without notifying", async () => {
		const reason = new Error("Storage unavailable");
		save.mockRejectedValue(reason);
		await show();
		await selectPageSize("200");
		await submitPageSize();

		await vi.waitFor(() => {
			expect(container.querySelector('[role="alert"]')?.textContent).toBe(
				"Could not save items per page: Error: Storage unavailable",
			);
			expect(button("Save").disabled).toBe(false);
		});
		expect(save).toHaveBeenCalledExactlyOnceWith({
			...settings,
			pageSize: 200,
		});
		expect(onSettingsChange).not.toHaveBeenCalled();
	});

	test.each([
		true,
		false,
	])("toggles column management from %s while retaining saved choices", async (enabled) => {
		settings.columnManagement = enabled;
		await show();

		await act(() => checkbox("Enable column management").click());

		expect(save).toHaveBeenCalledExactlyOnceWith({
			...settings,
			columnManagement: !enabled,
		});
		await vi.waitFor(() => expect(onSettingsChange).toHaveBeenCalledOnce());
	});

	const changes = [
		{
			name: "filter selection",
			click: () => checkbox("Search").click(),
			next: () => ({
				...settings,
				filters: { ...settings.filters, search: false },
			}),
		},
		{
			name: "column selection",
			click: () => checkbox("Artist").click(),
			next: (): CollectionSettings => ({
				...settings,
				columns: ["aat", "r", "a"],
			}),
		},
		{
			name: "column removal",
			click: () => checkbox("Cover art").click(),
			next: (): CollectionSettings => ({ ...settings, columns: ["r"] }),
		},
		{
			name: "restoring defaults",
			click: () => button("Restore defaults").click(),
			next: (): CollectionSettings => ({ ...settings, columns: null }),
		},
	];

	test.each(changes)("saves $name and notifies on success", async (change) => {
		await show();

		await act(change.click);

		expect(save).toHaveBeenCalledExactlyOnceWith(change.next());
		await vi.waitFor(() => expect(onSettingsChange).toHaveBeenCalledOnce());
	});

	test.each([
		...changes,
		{
			name: "column management",
			click: () => checkbox("Enable column management").click(),
			next: () => ({ ...settings, columnManagement: false }),
		},
	])("logs a caught $name failure without notifying", async (change) => {
		const reason = new Error("Storage unavailable");
		const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
		save.mockRejectedValue(reason);
		await show();

		await act(change.click);

		expect(save).toHaveBeenCalledExactlyOnceWith(change.next());
		await vi.waitFor(() => expect(log).toHaveBeenCalledExactlyOnceWith(reason));
		expect(onSettingsChange).not.toHaveBeenCalled();
	});
});
