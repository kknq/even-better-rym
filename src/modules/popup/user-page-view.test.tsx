// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
	defaultUserPageSettings,
	getUserPageSettings,
	setUserPageSettings,
} from "~/shared/user-page/settings";

import { UserPageView } from "./user-page-view";

vi.mock("~/shared/user-page/settings", async (importOriginal) => ({
	...(await importOriginal<typeof import("~/shared/user-page/settings")>()),
	getUserPageSettings: vi.fn(),
	setUserPageSettings: vi.fn(),
}));
vi.mock("webextension-polyfill", () => ({
	default: { runtime: { getURL: (path: string) => path } },
}));
vi.mock("~/shared/page-settings", () => ({}));

let container: HTMLDivElement;
const onSettingsChange = vi.fn();

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(getUserPageSettings).mockResolvedValue(defaultUserPageSettings());
	vi.mocked(setUserPageSettings).mockResolvedValue();
	container = document.createElement("div");
	document.body.append(container);
});

afterEach(async () => {
	await act(() => render(null, container));
	container.remove();
	vi.restoreAllMocks();
});

async function showSettings() {
	await act(() =>
		render(<UserPageView onSettingsChange={onSettingsChange} />, container),
	);
}

function switches() {
	return [...container.querySelectorAll<HTMLButtonElement>('[role="switch"]')];
}

async function clickSwitch(index: number) {
	await act(() => switches()[index].click());
	await vi.waitFor(() => {
		expect(switches().every((button) => !button.disabled)).toBe(true);
	});
}

test("shows loading until settings arrive", async () => {
	vi.mocked(getUserPageSettings).mockReturnValue(new Promise(() => undefined));
	await showSettings();
	expect(container.textContent).toContain("Loading");
	expect(switches()).toHaveLength(0);
});

test("shows both settings enabled by default without saving", async () => {
	await showSettings();
	expect(
		switches().map((button) => button.getAttribute("aria-checked")),
	).toEqual(["true", "true"]);
	expect(container.textContent).toContain("Follow status");
	expect(container.textContent).toContain("Profile edit boxes");
	expect(setUserPageSettings).not.toHaveBeenCalled();
	expect(onSettingsChange).not.toHaveBeenCalled();
});

test("restores independently disabled preferences", async () => {
	vi.mocked(getUserPageSettings).mockResolvedValue({
		followStatus: false,
		editBoxes: true,
	});
	await showSettings();
	expect(
		switches().map((button) => button.getAttribute("aria-checked")),
	).toEqual(["false", "true"]);
});

test.each([
	[0, "followStatus"],
	[1, "editBoxes"],
] as const)("persists switch %s independently", async (index, key) => {
	await showSettings();
	await clickSwitch(index);
	expect(setUserPageSettings).toHaveBeenCalledExactlyOnceWith({
		...defaultUserPageSettings(),
		[key]: false,
	});
	expect(switches()[index].getAttribute("aria-checked")).toBe("false");
	expect(onSettingsChange).toHaveBeenCalledOnce();
});

test("preserves the first preference when toggling the second", async () => {
	await showSettings();
	await clickSwitch(0);
	await clickSwitch(1);
	expect(setUserPageSettings).toHaveBeenLastCalledWith({
		followStatus: false,
		editBoxes: false,
	});
	expect(onSettingsChange).toHaveBeenCalledTimes(2);
});

test("waits for persistence and disables switches while saving", async () => {
	const saved = Promise.withResolvers<void>();
	vi.mocked(setUserPageSettings).mockReturnValue(saved.promise);
	await showSettings();
	await act(() => switches()[0].click());
	expect(switches().every((button) => button.disabled)).toBe(true);
	expect(switches()[0].getAttribute("aria-checked")).toBe("true");
	expect(onSettingsChange).not.toHaveBeenCalled();
	await act(() => saved.resolve());
	await vi.waitFor(() => {
		expect(switches()[0].getAttribute("aria-checked")).toBe("false");
	});
	expect(switches().every((button) => !button.disabled)).toBe(true);
});

test("surfaces save errors without changing the saved switch state", async () => {
	const error = new Error("Storage unavailable");
	const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
	vi.mocked(setUserPageSettings).mockRejectedValueOnce(error);
	await showSettings();
	await clickSwitch(0);
	expect(container.querySelector('[role="alert"]')?.textContent).toContain(
		"Could not save settings",
	);
	expect(log).toHaveBeenCalledWith(
		"EvenBetterRYM: could not save user page settings",
		error,
	);
	expect(switches()[0].getAttribute("aria-checked")).toBe("true");
	expect(switches()[0].disabled).toBe(false);
	expect(onSettingsChange).not.toHaveBeenCalled();
	await clickSwitch(0);
	expect(container.querySelector('[role="alert"]')).toBeNull();
	expect(switches()[0].getAttribute("aria-checked")).toBe("false");
});

test("surfaces errors loading preferences", async () => {
	const error = new Error("Storage unavailable");
	const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
	vi.mocked(getUserPageSettings).mockRejectedValueOnce(error);
	await showSettings();
	await vi.waitFor(() => {
		expect(container.querySelector('[role="alert"]')?.textContent).toContain(
			"Could not load settings",
		);
	});
	expect(log).toHaveBeenCalledWith(
		"EvenBetterRYM: could not load user page settings",
		error,
	);
	expect(switches()).toHaveLength(0);
});
