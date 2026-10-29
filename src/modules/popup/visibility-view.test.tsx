// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	defaultRatingSettings,
	defaultReviewSettings,
	getRatingSettings,
	getReviewSettings,
	reviewVisibilityPages,
	setRatingSettings,
	setReviewSettings,
	visibilityPages,
} from "~/shared/visibility/settings";
import { RatingVisibilityView, ReviewVisibilityView } from "./visibility-view";

vi.mock("~/shared/visibility/settings", async (importOriginal) => ({
	...(await importOriginal<typeof import("~/shared/visibility/settings")>()),
	getRatingSettings: vi.fn(),
	getReviewSettings: vi.fn(),
	setRatingSettings: vi.fn(),
	setReviewSettings: vi.fn(),
}));
vi.mock("webextension-polyfill", () => ({
	default: { runtime: { getURL: (path: string) => path } },
}));
vi.mock("~/shared/page-settings", () => ({}));

let container: HTMLDivElement;
const onSettingsChange = vi.fn();

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(getRatingSettings).mockResolvedValue(defaultRatingSettings());
	vi.mocked(getReviewSettings).mockResolvedValue(defaultReviewSettings());
	vi.mocked(setRatingSettings).mockResolvedValue();
	vi.mocked(setReviewSettings).mockResolvedValue();
	container = document.createElement("div");
	document.body.appendChild(container);
});

afterEach(async () => {
	await act(() => render(null, container));
	container.remove();
});

function selectFor(label: string): HTMLSelectElement {
	const row = [...container.querySelectorAll("label")].find(
		(candidate) => candidate.querySelector("span")?.textContent === label,
	);
	const select = row?.querySelector("select");
	if (!select) throw new Error(`Missing select: ${label}`);
	return select;
}

async function changeSelect(label: string, value: string) {
	const select = selectFor(label);
	await act(() => {
		select.value = value;
		select.dispatchEvent(new Event("change", { bubbles: true }));
	});
}

async function showRatings() {
	await act(() =>
		render(
			<RatingVisibilityView onSettingsChange={onSettingsChange} />,
			container,
		),
	);
	await vi.waitFor(() =>
		expect(container.querySelector("main")).not.toBeNull(),
	);
}

async function showReviews() {
	await act(() =>
		render(
			<ReviewVisibilityView onSettingsChange={onSettingsChange} />,
			container,
		),
	);
	await vi.waitFor(() =>
		expect(container.querySelector("main")).not.toBeNull(),
	);
}

describe("RatingVisibilityView", () => {
	test("shows loading until settings resolve", async () => {
		vi.mocked(getRatingSettings).mockReturnValue(new Promise(() => undefined));
		await act(() =>
			render(
				<RatingVisibilityView onSettingsChange={onSettingsChange} />,
				container,
			),
		);
		expect(container.textContent).toContain("Loading");
		expect(container.querySelector("main")).toBeNull();
	});

	test("loads current settings without writing or notifying", async () => {
		await showRatings();
		expect(selectFor("Ratings").value).toBe("unrated");
		expect(selectFor("Friends' ratings").value).toBe("after-release-rated");
		expect(selectFor("Track ratings").value).toBe("after-release-rated");
		expect(container.textContent).toContain("Label pages");
		expect(container.textContent).toContain("Classifier pages");
		expect(container.querySelectorAll('[role="switch"]')).toHaveLength(
			visibilityPages.length + 2,
		);
		expect(setRatingSettings).not.toHaveBeenCalled();
		expect(onSettingsChange).not.toHaveBeenCalled();
	});

	test("renders saved non-default rating policies rather than resetting them", async () => {
		const defaults = defaultRatingSettings();
		vi.mocked(getRatingSettings).mockResolvedValue({
			...defaults,
			pages: { ...defaults.pages, release: false },
			ratings: "always",
			counts: "scores-and-counts",
			friends: "never",
			buttons: false,
			globalButton: true,
		});
		await showRatings();
		expect(selectFor("Ratings").value).toBe("always");
		expect(selectFor("Rating, review, and wishlist counts").value).toBe(
			"scores-and-counts",
		);
		expect(selectFor("Friends' ratings").value).toBe("never");
		const toggles = container.querySelectorAll('[role="switch"]');
		expect(toggles[0].getAttribute("aria-checked")).toBe("false");
		expect(toggles[visibilityPages.length].getAttribute("aria-checked")).toBe(
			"false",
		);
		expect(
			toggles[visibilityPages.length + 1].getAttribute("aria-checked"),
		).toBe("true");
		expect(setRatingSettings).not.toHaveBeenCalled();
	});

	test.each(
		visibilityPages,
	)("toggles the %s policy without changing other pages or preferences", async (page) => {
		await showRatings();
		const index = visibilityPages.indexOf(page);
		const toggle =
			container.querySelectorAll<HTMLButtonElement>('[role="switch"]')[index];
		await act(() => toggle.click());
		const defaults = defaultRatingSettings();
		expect(setRatingSettings).toHaveBeenCalledExactlyOnceWith({
			...defaults,
			pages: { ...defaults.pages, [page]: false },
		});
		expect(onSettingsChange).toHaveBeenCalledOnce();
		expect(setReviewSettings).not.toHaveBeenCalled();
	});

	test.each([
		["Ratings", "always", "ratings"],
		["Rating, review, and wishlist counts", "scores-and-counts", "counts"],
		["Friends' ratings", "never", "friends"],
		["Friends' ratings", "always", "friends"],
		["Track ratings", "after-track-rated", "tracks"],
	] as const)("saves %s = %s without replacing other preferences", async (label, value, key) => {
		await showRatings();
		await changeSelect(label, value);
		expect(setRatingSettings).toHaveBeenCalledExactlyOnceWith({
			...defaultRatingSettings(),
			[key]: value,
		});
		expect(onSettingsChange).toHaveBeenCalledOnce();
	});

	test("hides track controls when all ratings are hidden and preserves their saved policy", async () => {
		await showRatings();
		await changeSelect("Track ratings", "after-track-rated");
		await changeSelect("Ratings", "always");
		expect(
			[...container.querySelectorAll("label")].some((label) =>
				label.textContent?.startsWith("Track ratings"),
			),
		).toBe(false);
		await changeSelect("Ratings", "unrated");
		expect(selectFor("Track ratings").value).toBe("after-track-rated");
		expect(setRatingSettings).toHaveBeenLastCalledWith({
			...defaultRatingSettings(),
			tracks: "after-track-rated",
		});
	});

	test.each([
		[0, "buttons", false],
		[1, "globalButton", true],
	] as const)("saves control toggle %s independently", async (offset, key, value) => {
		await showRatings();
		const toggle =
			container.querySelectorAll<HTMLButtonElement>('[role="switch"]')[
				visibilityPages.length + offset
			];
		await act(() => toggle.click());
		expect(setRatingSettings).toHaveBeenCalledExactlyOnceWith({
			...defaultRatingSettings(),
			[key]: value,
		});
		expect(onSettingsChange).toHaveBeenCalledOnce();
	});
});

describe("ReviewVisibilityView", () => {
	test("shows loading until settings resolve", async () => {
		vi.mocked(getReviewSettings).mockReturnValue(new Promise(() => undefined));
		await act(() =>
			render(
				<ReviewVisibilityView onSettingsChange={onSettingsChange} />,
				container,
			),
		);
		expect(container.textContent).toContain("Loading");
	});

	test("loads review policies and offers only supported page toggles", async () => {
		await showReviews();
		expect(selectFor("Reviews").value).toBe("always");
		expect(selectFor("Friends' reviews").value).toBe("always");
		expect(container.querySelectorAll('[role="switch"]')).toHaveLength(
			reviewVisibilityPages.length + 2,
		);
		expect(setReviewSettings).not.toHaveBeenCalled();
		expect(onSettingsChange).not.toHaveBeenCalled();
	});

	test("renders saved review preferences independently of rating preferences", async () => {
		const defaults = defaultReviewSettings();
		vi.mocked(getReviewSettings).mockResolvedValue({
			...defaults,
			pages: { ...defaults.pages, release: false, home: true },
			reviews: "unrated",
			friends: "never",
		});
		await showReviews();
		expect(selectFor("Reviews").value).toBe("unrated");
		expect(selectFor("Friends' reviews").value).toBe("never");
		const toggles = container.querySelectorAll('[role="switch"]');
		expect(toggles[0].getAttribute("aria-checked")).toBe("false");
		expect(
			toggles[reviewVisibilityPages.indexOf("home")].getAttribute(
				"aria-checked",
			),
		).toBe("true");
		expect(getRatingSettings).not.toHaveBeenCalled();
		expect(setReviewSettings).not.toHaveBeenCalled();
	});

	test.each(
		reviewVisibilityPages,
	)("toggles the %s review policy without changing ratings", async (page) => {
		await showReviews();
		const defaults = defaultReviewSettings();
		await act(() =>
			container
				.querySelectorAll<HTMLButtonElement>('[role="switch"]')
				[reviewVisibilityPages.indexOf(page)].click(),
		);
		expect(setReviewSettings).toHaveBeenCalledExactlyOnceWith({
			...defaults,
			pages: { ...defaults.pages, [page]: !defaults.pages[page] },
		});
		expect(setRatingSettings).not.toHaveBeenCalled();
		expect(onSettingsChange).toHaveBeenCalledOnce();
	});

	test.each([
		["Reviews", "unrated", "reviews"],
		["Friends' reviews", "never", "friends"],
		["Friends' reviews", "after-release-rated", "friends"],
	] as const)("saves %s = %s without changing unrelated policies", async (label, value, key) => {
		await showReviews();
		await changeSelect(label, value);
		expect(setReviewSettings).toHaveBeenCalledExactlyOnceWith({
			...defaultReviewSettings(),
			[key]: value,
		});
		expect(onSettingsChange).toHaveBeenCalledOnce();
	});

	test.each([
		[0, "buttons", false],
		[1, "globalButton", true],
	] as const)("saves review control toggle %s independently", async (offset, key, value) => {
		await showReviews();
		await act(() =>
			container
				.querySelectorAll<HTMLButtonElement>('[role="switch"]')
				[reviewVisibilityPages.length + offset].click(),
		);
		expect(setReviewSettings).toHaveBeenCalledExactlyOnceWith({
			...defaultReviewSettings(),
			[key]: value,
		});
		expect(onSettingsChange).toHaveBeenCalledOnce();
	});
});
