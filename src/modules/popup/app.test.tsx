// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getAllModulesEnabled, setModuleEnabled } from "~/shared/page-settings";
import { type PageKey, pageLabels, pages } from "~/shared/pages";
import { App, Toggle } from "./app";

vi.mock("webextension-polyfill", () => ({
	default: {
		runtime: { getURL: (path: string) => `moz-extension://test/${path}` },
	},
}));
vi.mock("~/shared/page-settings", () => ({
	getAllModulesEnabled: vi.fn(),
	setModuleEnabled: vi.fn(),
}));
vi.mock("./collection-view", () => ({
	CollectionView: ({
		kind,
		onSettingsChange,
	}: {
		kind: string;
		onSettingsChange: () => void;
	}) => (
		<button type="button" onClick={onSettingsChange}>
			Collection {kind} settings
		</button>
	),
}));
vi.mock("./shortcut-view", () => ({
	ShortcutView: ({ onSettingsChange }: { onSettingsChange: () => void }) => (
		<button type="button" onClick={onSettingsChange}>
			Shortcut settings
		</button>
	),
}));
vi.mock("./visibility-view", () => ({
	RatingVisibilityView: ({
		onSettingsChange,
	}: {
		onSettingsChange: () => void;
	}) => (
		<button type="button" onClick={onSettingsChange}>
			Rating settings
		</button>
	),
	ReviewVisibilityView: ({
		onSettingsChange,
	}: {
		onSettingsChange: () => void;
	}) => (
		<button type="button" onClick={onSettingsChange}>
			Review settings
		</button>
	),
}));
vi.mock("./vote-visibility-view", () => ({
	VoteVisibilityView: ({
		onSettingsChange,
	}: {
		onSettingsChange: () => void;
	}) => (
		<button type="button" onClick={onSettingsChange}>
			Vote settings
		</button>
	),
}));

let container: HTMLDivElement;
let features: Record<PageKey, boolean>;

beforeEach(() => {
	vi.resetAllMocks();
	features = Object.fromEntries(
		Object.keys(pages).map((key) => [key, key !== "hideReviews"]),
	) as Record<PageKey, boolean>;
	vi.mocked(getAllModulesEnabled).mockResolvedValue(features);
	vi.mocked(setModuleEnabled).mockResolvedValue();
	container = document.createElement("div");
	document.body.appendChild(container);
});

afterEach(async () => {
	await act(() => render(null, container));
	container.remove();
});

function findButton(text: string): HTMLButtonElement {
	const button = [...container.querySelectorAll("button")].find((candidate) =>
		candidate.textContent?.startsWith(text),
	);
	if (!button) throw new Error(`Missing button: ${text}`);
	return button;
}

function featureRow(key: PageKey): HTMLLabelElement {
	const row = [...container.querySelectorAll("label")].find((candidate) =>
		candidate.textContent?.startsWith(pageLabels[key]),
	);
	if (!row) throw new Error(`Missing feature: ${key}`);
	return row;
}

async function showApp() {
	await act(() => render(<App />, container));
	await vi.waitFor(() => {
		expect(container.querySelector("output")).toBeNull();
	});
}

describe("App", () => {
	test("shows a loading indicator before feature settings resolve", async () => {
		vi.mocked(getAllModulesEnabled).mockReturnValue(
			new Promise(() => undefined),
		);
		await act(() => render(<App />, container));
		expect(container.querySelector("output")?.textContent).toContain(
			"Loading settings",
		);
		expect(container.querySelector("img")?.src).toBe(
			"moz-extension://test/icons/sonemic-48.png",
		);
		expect(container.querySelector('[role="switch"]')).toBeNull();
	});

	test("expands and collapses groups without changing saved settings", async () => {
		await showApp();
		const group = findButton("Search and navigation");
		expect(group.getAttribute("aria-expanded")).toBe("false");
		await act(() => group.click());
		expect(group.getAttribute("aria-expanded")).toBe("true");
		expect(featureRow("searchBar").textContent).toContain(
			"Search Bar Shortcuts",
		);
		await act(() => group.click());
		expect(group.getAttribute("aria-expanded")).toBe("false");
		expect(container.querySelector('[role="switch"]')).toBeNull();
		expect(setModuleEnabled).not.toHaveBeenCalled();
	});

	test.each([
		["hideRatings", true, false],
		["hideReviews", false, true],
	] as const)("persists %s changes and offers a dismissible reload notice", async (key, initial, next) => {
		await showApp();
		await act(() => findButton("Content visibility").click());
		const toggle =
			featureRow(key).querySelector<HTMLButtonElement>('[role="switch"]');
		expect(toggle?.getAttribute("aria-checked")).toBe(String(initial));

		await act(() => toggle?.click());
		await vi.waitFor(() => {
			expect(toggle?.getAttribute("aria-checked")).toBe(String(next));
		});
		expect(setModuleEnabled).toHaveBeenCalledExactlyOnceWith(key, next);
		const dismiss = container.querySelector<HTMLButtonElement>(
			'[aria-label="Dismiss reload notice"]',
		);
		expect(dismiss).not.toBeNull();
		await act(() => dismiss?.click());
		expect(
			container.querySelector('[aria-label="Dismiss reload notice"]'),
		).toBeNull();
	});

	test("updates the switch only after persistence finishes", async () => {
		const saved = Promise.withResolvers<void>();
		vi.mocked(setModuleEnabled).mockReturnValue(saved.promise);
		await showApp();
		await act(() => findButton("Search and navigation").click());
		const toggle =
			featureRow("searchBar").querySelector<HTMLButtonElement>(
				'[role="switch"]',
			);
		await act(() => toggle?.click());
		expect(toggle?.getAttribute("aria-checked")).toBe("true");
		expect(
			container.querySelector('[aria-label="Dismiss reload notice"]'),
		).toBeNull();
		await act(() => saved.resolve());
		await vi.waitFor(() => {
			expect(toggle?.getAttribute("aria-checked")).toBe("false");
		});
	});

	test.each([
		["Charts", "chartShortcuts", "Chart Shortcuts", "Shortcut settings"],
		["Content visibility", "hideRatings", "Hide Ratings", "Rating settings"],
		["Content visibility", "hideReviews", "Hide Reviews", "Review settings"],
		["Content visibility", "hideVotes", "Hide Votes", "Vote settings"],
		[
			"Library and user profiles",
			"userCollection",
			"Music Collection",
			"Collection music settings",
		],
		[
			"Library and user profiles",
			"filmCollection",
			"Film Collection",
			"Collection film settings",
		],
	] as const)("opens %s / %s configuration and returns to the expanded feature list", async (group, key, title, child) => {
		await showApp();
		await act(() => findButton(group).click());
		await act(() => featureRow(key).querySelector("button")?.click());
		expect(container.querySelector("header")?.textContent).toContain(title);
		expect(container.querySelector("img")).toBeNull();

		await act(() => findButton(child).click());
		expect(
			container.querySelector('[aria-label="Dismiss reload notice"]'),
		).not.toBeNull();
		await act(() =>
			container
				.querySelector<HTMLButtonElement>('[aria-label="Back"]')
				?.click(),
		);
		expect(findButton(group).getAttribute("aria-expanded")).toBe("true");
		expect(container.querySelector("header")?.textContent).toContain(
			"EvenBetterRYM",
		);
		expect(setModuleEnabled).not.toHaveBeenCalled();
	});
});

describe("Toggle", () => {
	test.each([
		true,
		false,
	])("exposes the checked state and delegates clicks (%s)", async (checked) => {
		const onChange = vi.fn();
		await act(() =>
			render(<Toggle checked={checked} onChange={onChange} />, container),
		);
		const toggle =
			container.querySelector<HTMLButtonElement>('[role="switch"]');
		expect(toggle?.getAttribute("aria-checked")).toBe(String(checked));
		await act(() => toggle?.click());
		expect(onChange).toHaveBeenCalledOnce();
	});
});
