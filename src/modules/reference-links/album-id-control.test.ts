// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	appendAlbumIdControl,
	reduceTitleTopSpacing,
} from "./album-id-control";

let titleElement: HTMLDivElement;
let section: HTMLDivElement;
let clipboardDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
	document.body.innerHTML = "";
	section = document.createElement("div");
	section.className = "section_main_info section_outer";
	section.style.paddingTop = "20px";
	const pageSection = document.createElement("div");
	pageSection.className = "page_section";
	titleElement = document.createElement("div");
	titleElement.className = "album_title";
	const albumId = document.createElement("input");
	albumId.className = "album_shortcut";
	albumId.value = "[Album17191098]";
	const referenceLinks = document.createElement("div");
	referenceLinks.className = "ebr-reference-links";
	const referenceLink = document.createElement("a");
	referenceLink.className = "ebr-reference-link";
	vi.spyOn(referenceLink, "getBoundingClientRect").mockReturnValue(
		new DOMRect(0, 0, 120, 28),
	);
	referenceLinks.append(referenceLink);
	titleElement.append(albumId, referenceLinks);
	pageSection.append(titleElement);
	section.append(pageSection);
	document.body.append(section);
	clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
});

afterEach(() => {
	if (clipboardDescriptor) {
		Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
	} else {
		Reflect.deleteProperty(navigator, "clipboard");
	}
	vi.useRealTimers();
	document.body.innerHTML = "";
});

describe("appendAlbumIdControl", () => {
	test("adds an accessible copy button and hides the original album ID", () => {
		appendAlbumIdControl(titleElement, "#60758a");

		const button =
			titleElement.querySelector<HTMLButtonElement>(".ebr-album-id-copy");
		expect(button?.textContent).toBe("?");
		expect(button?.dataset.albumId).toBe("[Album17191098]");
		expect(button?.getAttribute("aria-label")).toBe("Copy [Album17191098]");
		expect(button?.style.getPropertyValue("--ebr-reference-button-color")).toBe(
			"#60758a",
		);
		expect(button?.style.getPropertyValue("--ebr-album-id-control-size")).toBe(
			"28px",
		);
		expect(
			titleElement.querySelector<HTMLInputElement>(".album_shortcut")?.hidden,
		).toBe(true);
	});

	test("copies the Album ID and shows confirmation in the hint", async () => {
		vi.useFakeTimers();
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText },
		});
		appendAlbumIdControl(titleElement, "#60758a");

		titleElement
			.querySelector<HTMLButtonElement>(".ebr-album-id-copy")
			?.click();
		await vi.advanceTimersByTimeAsync(0);

		expect(writeText).toHaveBeenCalledWith("[Album17191098]");
		const button =
			titleElement.querySelector<HTMLButtonElement>(".ebr-album-id-copy");
		expect(button?.dataset.albumId).toBe("ID copied to clipboard!");
		expect(button?.getAttribute("aria-label")).toBe("ID copied to clipboard!");
		expect(button?.classList.contains("ebr-album-id-copy-feedback")).toBe(true);

		await vi.advanceTimersByTimeAsync(2200);
		expect(button?.dataset.albumId).toBe("[Album17191098]");
		expect(button?.classList.contains("ebr-album-id-copy-feedback")).toBe(
			false,
		);
	});

	test("shows copy errors in the hint when the clipboard write fails", async () => {
		vi.useFakeTimers();
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) },
		});
		appendAlbumIdControl(titleElement, "#60758a");

		titleElement
			.querySelector<HTMLButtonElement>(".ebr-album-id-copy")
			?.click();
		await vi.advanceTimersByTimeAsync(0);

		expect(
			titleElement.querySelector<HTMLButtonElement>(".ebr-album-id-copy")
				?.dataset.albumId,
		).toBe("Unable to copy the Album ID");
	});
});

test("halves section top padding and updates it when the viewport changes", () => {
	reduceTitleTopSpacing(titleElement);
	expect(
		section.style.getPropertyValue("--ebr-reference-title-padding-top"),
	).toBe("10px");
	expect(section.classList.contains("ebr-reference-title-spacing")).toBe(true);

	section.style.paddingTop = "40px";
	window.dispatchEvent(new Event("resize"));
	expect(
		section.style.getPropertyValue("--ebr-reference-title-padding-top"),
	).toBe("20px");
});
