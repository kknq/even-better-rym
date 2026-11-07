// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
	DiscographyRateLimitError,
	loadSection,
} from "~/shared/artist-discography";
import {
	getSelectedTypes,
	watchSelectedTypes,
} from "~/shared/discography-progress/settings";
import { releaseTypes } from "~/shared/release-types";
import { main } from "./app";

vi.mock("~/shared/artist-discography", async (importOriginal) => ({
	...(await importOriginal<typeof import("~/shared/artist-discography")>()),
	loadSection: vi.fn(),
}));
vi.mock("~/shared/discography-progress/settings", () => ({
	getSelectedTypes: vi.fn(),
	watchSelectedTypes: vi.fn(),
}));
vi.mock("~/shared/utils/messaging", () => ({
	sendBackgroundMessage: vi.fn(),
}));
vi.mock("~/shared/utils/storage", () => ({ get: vi.fn(), set: vi.fn() }));

function row(id: number, status = "Rate") {
	return `<div class="disco_release" id="release_${id}">
		<span class="disco_cat_inner">${status}</span></div>`;
}

function section(type: string, rows: string, total: number) {
	return `<div class="disco_header_top"><h3>${type}</h3>
		<span id="disco_header_showing_${type}">Showing 1 of ${total}</span></div>
		<div id="disco_type_${type}">${rows}</div>`;
}

function overall() {
	return document.querySelector(".ebr-discography-overall progress");
}

beforeEach(() => {
	vi.resetAllMocks();
	document.body.innerHTML = `<div id="discography">
		${section("s", row(1, "4.0") + row(2), 2)}
		${section("e", row(3, "Listened"), 1)}</div>`;
	vi.mocked(getSelectedTypes).mockResolvedValue(new Set(["s", "e"]));
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

test("places category bars beside headings and a deduplicated overall bar above", async () => {
	await main();
	expect(document.querySelectorAll(".ebr-discography-category")).toHaveLength(
		2,
	);
	expect(
		document.querySelector(".disco_header_top .ebr-discography-bar > span")
			?.textContent,
	).toBe("You have listened to 1 of 2");
	expect(
		document
			.querySelector(".disco_header_top")
			?.classList.contains("ebr-discography-heading"),
	).toBe(true);
	expect(overall()?.getAttribute("max")).toBe("3");
	expect(overall()?.getAttribute("value")).toBe("2");
	expect(document.querySelector("#discography")?.previousElementSibling).toBe(
		document.querySelector(".ebr-discography-overall"),
	);
	await main();
	expect(document.querySelectorAll(".ebr-discography-overall")).toHaveLength(1);
	expect(loadSection).not.toHaveBeenCalled();
});

test("keeps settings in the popup and applies changes without hiding category bars", async () => {
	await main();
	const changed = vi.mocked(watchSelectedTypes).mock.calls[0][0];
	changed(new Set(["e"]));
	expect(overall()?.getAttribute("max")).toBe("1");
	expect(overall()?.getAttribute("value")).toBe("1");
	expect(document.querySelectorAll(".ebr-discography-category")).toHaveLength(
		2,
	);
	expect(
		document.querySelectorAll(
			".ebr-discography-overall input, .ebr-discography-overall details",
		),
	).toHaveLength(0);
});

test("shows an explicit empty-selection state", async () => {
	vi.mocked(getSelectedTypes).mockResolvedValue(new Set());
	await main();
	expect(overall()).toBeNull();
	expect(
		document.querySelector(".ebr-discography-overall")?.textContent,
	).toContain("Select release types");
	expect(
		document.querySelector(".ebr-discography-overall")?.textContent,
	).toContain("extension popup");
});

test("uses watched for videos and music videos while keeping listened for audio and overall coverage", async () => {
	document.body.innerHTML = `<div id="discography">
		${section("s", row(1, "4.0"), 1)}
		${section("d", row(2, "4.5"), 1)}
		${section("o", row(3), 1)}</div>`;
	vi.mocked(getSelectedTypes).mockResolvedValue(new Set(["s", "d", "o"]));
	await main();
	const videos = document.querySelector('progress[aria-label="Videos"]');
	const musicVideos = document.querySelector(
		'progress[aria-label="Music videos"]',
	);
	const albums = document.querySelector('progress[aria-label="Albums"]');
	expect(videos?.previousElementSibling?.textContent).toBe(
		"You have watched 1 of 1",
	);
	expect(musicVideos?.previousElementSibling?.textContent).toBe(
		"You have watched 0 of 1",
	);
	expect(videos?.getAttribute("aria-valuetext")).toBe(
		"You have watched 1 of 1",
	);
	expect(musicVideos?.getAttribute("aria-valuetext")).toBe(
		"You have watched 0 of 1",
	);
	expect(albums?.previousElementSibling?.textContent).toBe(
		"You have listened to 1 of 1",
	);
	expect(overall()?.previousElementSibling?.textContent).toBe(
		"You have listened to 2 of 3",
	);
});

test("includes mixtapes and DJ mixes in category bars and selected overall coverage", async () => {
	document.body.innerHTML = `<div id="discography">
		${section("m", row(1, "4.0") + row(2), 2)}
		${section("j", row(3, "Listened") + row(4, "3.5"), 2)}</div>`;
	vi.mocked(getSelectedTypes).mockResolvedValue(new Set(["m", "j"]));
	await main();
	expect(
		document
			.querySelector('progress[aria-label="Mixtapes"]')
			?.getAttribute("value"),
	).toBe("1");
	expect(
		document
			.querySelector('progress[aria-label="DJ mixes"]')
			?.getAttribute("value"),
	).toBe("2");
	expect(overall()?.getAttribute("max")).toBe("4");
	expect(overall()?.getAttribute("value")).toBe("3");
	const changed = vi.mocked(watchSelectedTypes).mock.calls[0][0];
	changed(new Set(["m"]));
	expect(overall()?.getAttribute("max")).toBe("2");
	expect(overall()?.getAttribute("value")).toBe("1");
});

test("loads the full DJ mix category without expanding its list", async () => {
	document.body.innerHTML = `<div id="discography">${section("j", row(1), 2)}</div>`;
	vi.mocked(getSelectedTypes).mockResolvedValue(new Set(["j"]));
	vi.mocked(loadSection).mockResolvedValue(
		new DOMParser().parseFromString(row(1) + row(2, "4.5"), "text/html"),
	);
	await main();
	await vi.waitFor(() => {
		expect(overall()?.getAttribute("value")).toBe("1");
	});
	expect(loadSection).toHaveBeenCalledWith("j");
	expect(overall()?.getAttribute("max")).toBe("2");
	expect(
		document.querySelectorAll("#disco_type_j .disco_release"),
	).toHaveLength(1);
});

test("loads missing releases without modifying or expanding the RYM list", async () => {
	document.body.innerHTML = `<div id="discography">${section("s", row(1), 2)}</div>`;
	let finish: ((doc: Document) => void) | undefined;
	vi.mocked(loadSection).mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	await main();
	expect(overall()).toBeNull();
	expect(
		document.querySelector(".ebr-discography-overall")?.textContent,
	).toContain("Loading full discography");
	finish?.(
		new DOMParser().parseFromString(row(1) + row(2, "4.5"), "text/html"),
	);
	await vi.waitFor(() => {
		expect(overall()?.getAttribute("max")).toBe("2");
	});
	expect(overall()?.getAttribute("value")).toBe("1");
	expect(
		document.querySelectorAll("#disco_type_s .disco_release"),
	).toHaveLength(1);
});

test("prefers current visible ratings over cached listening statuses", async () => {
	document.body.innerHTML = `<div id="discography">${section("s", row(1, "4.5"), 2)}</div>`;
	vi.mocked(loadSection).mockResolvedValue(
		new DOMParser().parseFromString(row(1) + row(2, "Listened"), "text/html"),
	);
	await main();
	await vi.waitFor(() => {
		expect(overall()?.getAttribute("value")).toBe("2");
	});
	expect(overall()?.getAttribute("max")).toBe("2");
});

test("updates personal edits and reattaches bars after RYM replaces its lists", async () => {
	await main();
	const root = document.querySelector("#discography");
	if (!root) throw new Error("Missing test discography");
	root.innerHTML = section("s", row(1, "4.0") + row(2, "3.5"), 2);
	await vi.waitFor(() => {
		expect(overall()?.getAttribute("value")).toBe("3");
	});
	expect(document.querySelectorAll(".ebr-discography-category")).toHaveLength(
		1,
	);
	expect(overall()?.getAttribute("max")).toBe("3");
});

test("does not double-count releases in multiple categories", async () => {
	document.body.innerHTML = `<div id="discography">
		${section("s", row(1, "4.0"), 1)}
		${section("e", row(1, "4.0"), 1)}</div>`;
	await main();
	expect(overall()?.getAttribute("max")).toBe("1");
	expect(overall()?.getAttribute("value")).toBe("1");
	expect(
		document.querySelector(
			".ebr-discography-overall .ebr-discography-percentage",
		)?.textContent,
	).toBe("100%");
	expect(
		document.querySelector(
			'.ebr-discography-overall .ebr-discography-complete[aria-label="Complete"]',
		),
	).not.toBeNull();
	expect(document.querySelectorAll(".ebr-discography-complete")).toHaveLength(
		3,
	);
});

test("shows no completion star for partial or empty coverage", async () => {
	document.body.innerHTML = `<div id="discography">
		${section("s", row(1, "4.0") + row(2), 2)}
		${section("e", "", 0)}</div>`;
	await main();
	expect(document.querySelectorAll(".ebr-discography-complete")).toHaveLength(
		0,
	);
	expect(
		document.querySelector(".ebr-discography-percentage")?.textContent,
	).toBe("50%");
});

test("reports loading failures and retries without showing false full totals", async () => {
	const log = vi.spyOn(console, "error").mockReturnValue(undefined);
	document.body.innerHTML = `<div id="discography">${section("s", row(1), 2)}</div>`;
	vi.mocked(loadSection).mockRejectedValueOnce(new Error("Rate limited"));
	await main();
	await vi.waitFor(() => {
		expect(
			document.querySelector(".ebr-discography-category button"),
		).not.toBeNull();
	});

	expect(overall()).toBeNull();
	vi.mocked(loadSection).mockResolvedValue(
		new DOMParser().parseFromString(row(1) + row(2, "Listened"), "text/html"),
	);
	document
		.querySelector<HTMLButtonElement>(".ebr-discography-category button")
		?.click();
	await vi.waitFor(() => {
		expect(overall()?.getAttribute("value")).toBe("1");
	});
	expect(log).toHaveBeenCalled();
	log.mockRestore();
});

test("loads one category at a time and continues after non-rate-limit failures", async () => {
	const log = vi.spyOn(console, "error").mockReturnValue(undefined);
	document.body.innerHTML = `<div id="discography">
		${section("s", row(1), 2)}
		${section("e", row(3), 2)}</div>`;
	let fail: ((error: Error) => void) | undefined;
	vi.mocked(loadSection).mockImplementationOnce(
		() =>
			new Promise((_resolve, reject) => {
				fail = reject;
			}),
	);
	vi.mocked(loadSection).mockResolvedValue(
		new DOMParser().parseFromString(row(3) + row(4, "Listened"), "text/html"),
	);
	await main();
	expect(loadSection).toHaveBeenCalledExactlyOnceWith("s");
	expect(
		document.querySelectorAll(".ebr-discography-status")[1]?.textContent,
	).toBe("Waiting to load full coverage...");

	fail?.(new Error("Cannot load albums"));
	await vi.waitFor(() => {
		expect(
			document
				.querySelector('progress[aria-label="EPs"]')
				?.getAttribute("value"),
		).toBe("1");
	});
	expect(vi.mocked(loadSection).mock.calls.map(([type]) => type)).toEqual([
		"s",
		"e",
	]);
	expect(overall()).toBeNull();
	expect(
		document.querySelector(".ebr-discography-overall")?.textContent,
	).toContain(
		"Full coverage unavailable. Retry the affected categories below.",
	);
	expect(log).toHaveBeenCalledOnce();
});

test("does not fetch excluded categories until Load coverage is clicked", async () => {
	document.body.innerHTML = `<div id="discography">
			${section("s", row(1, "4.0"), 1)}
			${section("j", row(2), 2)}</div>`;
	vi.mocked(getSelectedTypes).mockResolvedValue(new Set(["s"]));
	vi.mocked(loadSection).mockResolvedValue(
		new DOMParser().parseFromString(row(2) + row(3, "4.5"), "text/html"),
	);
	await main();
	expect(loadSection).not.toHaveBeenCalled();
	expect(overall()?.getAttribute("max")).toBe("1");
	const button = document.querySelector<HTMLButtonElement>(
		".ebr-discography-category button",
	);
	expect(button?.textContent).toBe("Load coverage");
	expect(button?.classList.contains("ebr-discography-load")).toBe(true);
	button?.click();
	await vi.waitFor(() => {
		expect(
			document
				.querySelector('progress[aria-label="DJ mixes"]')
				?.getAttribute("value"),
		).toBe("1");
	});
	expect(loadSection).toHaveBeenCalledExactlyOnceWith("j");
	expect(overall()?.getAttribute("max")).toBe("1");
});

test("automatically loads every category when all release types are selected", async () => {
	const types = Object.keys(releaseTypes) as (keyof typeof releaseTypes)[];
	document.body.innerHTML = `<div id="discography">${types
		.map((type, index) => section(type, row(index * 2 + 1), 2))
		.join("")}</div>`;
	vi.mocked(getSelectedTypes).mockResolvedValue(new Set(types));
	vi.mocked(loadSection).mockImplementation((type) => {
		const index = types.indexOf(type);
		return Promise.resolve(
			new DOMParser().parseFromString(
				row(index * 2 + 1) + row(index * 2 + 2, "4.5"),
				"text/html",
			),
		);
	});
	await main();
	await vi.waitFor(() => {
		expect(overall()?.getAttribute("max")).toBe(String(types.length * 2));
	});
	expect(loadSection).toHaveBeenCalledTimes(types.length);
	expect(
		document.querySelectorAll(".ebr-discography-category progress"),
	).toHaveLength(types.length);
});

test("loads newly selected categories and skips deselected pending categories", async () => {
	document.body.innerHTML = `<div id="discography">
			${section("s", row(1), 2)}
			${section("e", row(3), 2)}
			${section("j", row(5), 2)}</div>`;
	let finish: ((value: Document) => void) | undefined;
	vi.mocked(loadSection).mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	vi.mocked(loadSection).mockResolvedValue(
		new DOMParser().parseFromString(row(5) + row(6, "4.5"), "text/html"),
	);
	await main();
	const changed = vi.mocked(watchSelectedTypes).mock.calls[0][0];
	changed(new Set(["j"]));
	finish?.(new DOMParser().parseFromString(row(1) + row(2), "text/html"));
	await vi.waitFor(() => {
		expect(overall()?.getAttribute("max")).toBe("2");
	});
	expect(vi.mocked(loadSection).mock.calls.map(([type]) => type)).toEqual([
		"s",
		"j",
	]);
});

test("stops all automatic loading on 429 and requires manual retry after cooldown", async () => {
	vi.useFakeTimers();
	const log = vi.spyOn(console, "error").mockReturnValue(undefined);
	document.body.innerHTML = `<div id="discography">
			${section("s", row(1), 2)}
			${section("e", row(3), 2)}
			${section("i", row(5), 2)}</div>`;
	vi.mocked(getSelectedTypes).mockResolvedValue(new Set(["s", "e", "i"]));
	vi.mocked(loadSection).mockRejectedValueOnce(
		new DiscographyRateLimitError(Date.now() + 60_000),
	);
	await main();
	await vi.advanceTimersByTimeAsync(0);
	expect(loadSection).toHaveBeenCalledTimes(1);
	expect(overall()).toBeNull();
	expect(document.querySelector('[role="status"]')?.textContent).toContain(
		"rate-limited",
	);
	expect(
		[
			...document.querySelectorAll<HTMLButtonElement>(
				".ebr-discography-category button",
			),
		].every((button) => button.disabled),
	).toBe(true);
	document
		.querySelector<HTMLButtonElement>(".ebr-discography-category button")
		?.click();
	expect(loadSection).toHaveBeenCalledTimes(1);

	await vi.advanceTimersByTimeAsync(60_000);
	expect(loadSection).toHaveBeenCalledTimes(1);
	const retry = document.querySelector<HTMLButtonElement>(
		".ebr-discography-category button",
	);
	expect(retry?.disabled).toBe(false);
	vi.mocked(loadSection).mockResolvedValue(
		new DOMParser().parseFromString(
			row(1) + row(2, "4.5") + row(3) + row(5),
			"text/html",
		),
	);
	retry?.click();
	await vi.runAllTimersAsync();
	expect(loadSection).toHaveBeenCalledTimes(4);
	expect(overall()).not.toBeNull();
	expect(log).toHaveBeenCalledOnce();
});
