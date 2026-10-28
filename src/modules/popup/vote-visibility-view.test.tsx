// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	defaultVoteVisibilitySettings,
	getVoteVisibilitySettings,
	setVoteVisibilitySettings,
} from "~/shared/hide-votes/settings";
import { VoteVisibilityView } from "./vote-visibility-view";

vi.mock("~/shared/hide-votes/settings", async (importOriginal) => ({
	...(await importOriginal<typeof import("~/shared/hide-votes/settings")>()),
	getVoteVisibilitySettings: vi.fn(),
	setVoteVisibilitySettings: vi.fn(),
}));
vi.mock("webextension-polyfill", () => ({
	default: { runtime: { getURL: (path: string) => path } },
}));
vi.mock("~/shared/page-settings", () => ({}));

let container: HTMLDivElement;
const onSettingsChange = vi.fn();

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(getVoteVisibilitySettings).mockResolvedValue(
		defaultVoteVisibilitySettings(),
	);
	vi.mocked(setVoteVisibilitySettings).mockResolvedValue();
	container = document.createElement("div");
	document.body.appendChild(container);
});

afterEach(async () => {
	await act(() => render(null, container));
	container.remove();
});

describe("VoteVisibilityView", () => {
	test("shows loading before settings arrive", async () => {
		vi.mocked(getVoteVisibilitySettings).mockReturnValue(
			new Promise(() => undefined),
		);
		await act(() =>
			render(
				<VoteVisibilityView onSettingsChange={onSettingsChange} />,
				container,
			),
		);
		expect(container.textContent).toContain("Loading");
		expect(container.querySelector("main")).toBeNull();
	});

	test("renders the current settings without persisting or notifying", async () => {
		await act(() =>
			render(
				<VoteVisibilityView onSettingsChange={onSettingsChange} />,
				container,
			),
		);
		await vi.waitFor(() =>
			expect(container.querySelectorAll('[role="switch"]')).toHaveLength(3),
		);
		expect(
			[...container.querySelectorAll('[role="switch"]')].map((toggle) =>
				toggle.getAttribute("aria-checked"),
			),
		).toEqual(["true", "true", "false"]);
		expect(setVoteVisibilitySettings).not.toHaveBeenCalled();
		expect(onSettingsChange).not.toHaveBeenCalled();
	});

	test("honors saved non-default vote visibility preferences", async () => {
		vi.mocked(getVoteVisibilitySettings).mockResolvedValue({
			genres: false,
			descriptors: false,
			hideStats: true,
		});
		await act(() =>
			render(
				<VoteVisibilityView onSettingsChange={onSettingsChange} />,
				container,
			),
		);
		await vi.waitFor(() =>
			expect(container.querySelectorAll('[role="switch"]')).toHaveLength(3),
		);
		expect(
			[...container.querySelectorAll('[role="switch"]')].map((toggle) =>
				toggle.getAttribute("aria-checked"),
			),
		).toEqual(["false", "false", "true"]);
		expect(setVoteVisibilitySettings).not.toHaveBeenCalled();
	});

	test.each([
		[0, "genres", false],
		[1, "descriptors", false],
		[2, "hideStats", true],
	] as const)("saves %s independently and updates the switch", async (index, key, value) => {
		await act(() =>
			render(
				<VoteVisibilityView onSettingsChange={onSettingsChange} />,
				container,
			),
		);
		await vi.waitFor(() =>
			expect(container.querySelectorAll('[role="switch"]')).toHaveLength(3),
		);
		const toggle =
			container.querySelectorAll<HTMLButtonElement>('[role="switch"]')[index];
		await act(() => toggle.click());
		expect(setVoteVisibilitySettings).toHaveBeenCalledExactlyOnceWith({
			...defaultVoteVisibilitySettings(),
			[key]: value,
		});
		expect(toggle.getAttribute("aria-checked")).toBe(String(value));
		expect(onSettingsChange).toHaveBeenCalledOnce();
	});

	test("retains earlier changes when saving a second preference", async () => {
		await act(() =>
			render(
				<VoteVisibilityView onSettingsChange={onSettingsChange} />,
				container,
			),
		);
		await vi.waitFor(() =>
			expect(container.querySelectorAll('[role="switch"]')).toHaveLength(3),
		);
		const toggles =
			container.querySelectorAll<HTMLButtonElement>('[role="switch"]');
		await act(() => toggles[0].click());
		await act(() => toggles[2].click());
		expect(setVoteVisibilitySettings).toHaveBeenLastCalledWith({
			genres: false,
			descriptors: true,
			hideStats: true,
		});
		expect(onSettingsChange).toHaveBeenCalledTimes(2);
	});
});
