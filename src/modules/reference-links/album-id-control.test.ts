// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	enableAlbumIdCopy,
	moveAlbumId,
	reduceTitleTopSpacing,
} from "./album-id-control";

let titleElement: HTMLDivElement;
let section: HTMLDivElement;
let albumId: HTMLInputElement;
let clipboardDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
	vi.useFakeTimers();
	document.body.innerHTML = `
		<div class="section_main_info section_outer" style="padding-top:20px">
			<div class="page_section">
				<div class="album_title">Release title
					<input aria-label="album shortcut" class="album_shortcut" readonly
						onclick="focus();select();" value="[Album17191098]">
					<div class="show-for-small album_artist_small">By Artist</div>
				</div>
				<table class="color_bar"><tbody><tr><td></td></tr></tbody></table>
				<div class="show-for-small">Mobile cover</div>
				<table class="album_info_outer"><tbody><tr>
					<td>Artist</td>
					<td style="vertical-align:middle"><div style="position:sticky; top:3em; z-index:200"><div id="ad">Ad</div></div></td>
				</tr></tbody></table>
			</div>
		</div>`;
	titleElement = document.querySelector<HTMLDivElement>(".album_title")!;
	section = document.querySelector<HTMLDivElement>(".section_main_info")!;
	albumId = document.querySelector<HTMLInputElement>(".album_shortcut")!;
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

function mockClipboard(writeText = vi.fn().mockResolvedValue(undefined)) {
	Object.defineProperty(navigator, "clipboard", {
		configurable: true,
		value: { writeText },
	});
	return writeText;
}

describe("moveAlbumId", () => {
	test("moves the original input above the sticky ad without adding a release row", () => {
		const inputFontSize = window.getComputedStyle(albumId).fontSize;
		moveAlbumId(titleElement);
		enableAlbumIdCopy(titleElement);

		const container = document.querySelector(".ebr-album-id-container");
		const stickyAd = document.querySelector(".ebr-album-id-sticky-ad");
		expect(container?.parentElement).toBe(
			document.querySelector(".album_info_outer td:nth-child(2)"),
		);
		expect(
			container?.parentElement?.classList.contains("ebr-album-id-sidebar"),
		).toBe(true);
		expect(container?.nextElementSibling).toBe(stickyAd);
		expect(stickyAd?.querySelector("#ad")).not.toBeNull();
		expect(container?.querySelector(".album_shortcut")).toBe(albumId);
		expect(albumId.hidden).toBe(false);
		expect(albumId.value).toBe("[Album17191098]");
		expect(albumId.readOnly).toBe(true);
		expect(albumId.style.fontSize).toBe(inputFontSize);
		expect(document.querySelector(".ebr-album-id-copy")).toBeNull();
		expect(titleElement.querySelector(".album_shortcut")).toBeNull();

		moveAlbumId(titleElement);
		expect(document.querySelectorAll(".ebr-album-id-container")).toHaveLength(
			1,
		);
	});

	test("places the ID below the color bar without a sticky ad sidebar", () => {
		document.querySelector(".album_info_outer")?.remove();
		moveAlbumId(titleElement);
		expect(albumId.parentElement).toBe(
			document.querySelector(".color_bar")?.nextElementSibling,
		);
		expect(
			albumId.parentElement?.classList.contains("ebr-album-id-inline"),
		).toBe(true);
		expect(document.querySelector(".ebr-album-id-sidebar")).toBeNull();
	});

	test("keeps the fallback ID out of the release info's layout flow", () => {
		const style = document.createElement("style");
		style.textContent = readFileSync(
			"src/modules/reference-links/reference-links.css",
			"utf8",
		);
		document.head.append(style);
		try {
			document.querySelector(".album_info_outer td:nth-child(2)")?.remove();
			moveAlbumId(titleElement);
			const container = albumId.parentElement!;
			const containerStyle = window.getComputedStyle(container);
			expect(containerStyle.height).toBe("0px");
			expect(containerStyle.marginTop).toBe("0px");
			expect(containerStyle.marginBottom).toBe("0px");
			expect(window.getComputedStyle(albumId).position).toBe("absolute");
			expect(container.nextElementSibling).toBe(
				document.querySelector(".show-for-small:not(.album_artist_small)"),
			);
		} finally {
			style.remove();
		}
	});

	test("falls back below the title when there is no color bar or sidebar", () => {
		document.querySelector(".album_info_outer")?.remove();
		document.querySelector(".color_bar")?.remove();
		moveAlbumId(titleElement);
		expect(albumId.parentElement).toBe(titleElement.nextElementSibling);
	});

	test("copies from the original label and displays temporary confirmation", async () => {
		const writeText = mockClipboard();
		moveAlbumId(titleElement);
		enableAlbumIdCopy(titleElement);
		albumId.click();
		await vi.advanceTimersByTimeAsync(0);

		expect(writeText).toHaveBeenCalledWith("[Album17191098]");
		const feedback = document.querySelector(".ebr-album-id-feedback");
		expect(feedback?.textContent).toBe("ID copied to clipboard!");
		expect(feedback?.getAttribute("role")).toBe("status");
		expect(albumId.value).toBe("[Album17191098]");
		expect(albumId.getAttribute("onclick")).toBeNull();
		expect(albumId.onclick).toBeNull();

		await vi.advanceTimersByTimeAsync(2200);
		expect(feedback?.textContent).toBe("");
		expect(albumId.value).toBe("[Album17191098]");
	});

	test("prevents mouse highlighting only when copying is enabled", () => {
		enableAlbumIdCopy(titleElement);
		const event = new MouseEvent("mousedown", {
			button: 0,
			cancelable: true,
		});
		albumId.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
	});

	test("blocks page click handlers and clears an existing input selection", async () => {
		const writeText = mockClipboard();
		const selectOnClick = vi.fn(() => albumId.select());
		albumId.addEventListener("click", selectOnClick);
		enableAlbumIdCopy(titleElement);
		albumId.select();
		albumId.click();
		await vi.advanceTimersByTimeAsync(0);

		expect(selectOnClick).not.toHaveBeenCalled();
		expect(albumId.selectionStart).toBe(0);
		expect(albumId.selectionEnd).toBe(0);
		expect(writeText).toHaveBeenCalledExactlyOnceWith("[Album17191098]");
		expect(document.querySelector(".ebr-album-id-feedback")?.textContent).toBe(
			"ID copied to clipboard!",
		);
	});

	test("positions the confirmation hint beside the unchanged label", async () => {
		mockClipboard();
		enableAlbumIdCopy(titleElement);
		const feedback = document.querySelector<HTMLElement>(
			".ebr-album-id-feedback",
		)!;
		vi.spyOn(albumId, "getBoundingClientRect").mockReturnValue(
			new DOMRect(300, 100, 160, 22),
		);
		vi.spyOn(feedback, "getBoundingClientRect").mockReturnValue(
			new DOMRect(0, 0, 200, 30),
		);
		albumId.click();
		await vi.advanceTimersByTimeAsync(0);

		expect(feedback.style.left).toBe("260px");
		expect(feedback.style.top).toBe("130px");
		expect(albumId.value).toBe("[Album17191098]");
	});

	test("copies the original ID on repeated clicks and renews confirmation", async () => {
		const writeText = mockClipboard();
		enableAlbumIdCopy(titleElement);
		albumId.click();
		await vi.advanceTimersByTimeAsync(1000);
		albumId.click();
		await vi.advanceTimersByTimeAsync(1500);
		expect(writeText).toHaveBeenNthCalledWith(2, "[Album17191098]");
		expect(albumId.value).toBe("[Album17191098]");
		expect(document.querySelector(".ebr-album-id-feedback")?.textContent).toBe(
			"ID copied to clipboard!",
		);
		await vi.advanceTimersByTimeAsync(700);
		expect(albumId.value).toBe("[Album17191098]");
	});

	test("retains manual selection without clipboard writes when copy is disabled", () => {
		const writeText = mockClipboard();
		moveAlbumId(titleElement);
		albumId.click();
		albumId.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
		expect(writeText).not.toHaveBeenCalled();
		expect(albumId.getAttribute("onclick")).toBe("focus();select();");
		expect(albumId.getAttribute("aria-label")).toBe("album shortcut");
		expect(document.querySelector(".ebr-album-id-feedback")).toBeNull();
	});

	test.each([
		"Enter",
		" ",
	])("supports keyboard copying with %s", async (key) => {
		const writeText = mockClipboard();
		moveAlbumId(titleElement);
		enableAlbumIdCopy(titleElement);
		albumId.dispatchEvent(new KeyboardEvent("keydown", { key }));
		await vi.advanceTimersByTimeAsync(0);
		expect(writeText).toHaveBeenCalledExactlyOnceWith("[Album17191098]");
	});

	test("surfaces clipboard failures beside the label", async () => {
		mockClipboard(vi.fn().mockRejectedValue(new Error("Denied")));
		moveAlbumId(titleElement);
		enableAlbumIdCopy(titleElement);
		albumId.click();
		await vi.advanceTimersByTimeAsync(0);
		expect(document.querySelector(".ebr-album-id-feedback")?.textContent).toBe(
			"Unable to copy the Album ID",
		);
		expect(albumId.value).toBe("[Album17191098]");
		await vi.advanceTimersByTimeAsync(2200);
		expect(albumId.value).toBe("[Album17191098]");
	});

	test("preserves the native label in the fallback container if the ad sidebar is absent", () => {
		document.querySelector(".album_info_outer")?.remove();
		moveAlbumId(titleElement);
		expect(albumId.parentElement).toBe(
			document.querySelector(".color_bar")?.nextElementSibling,
		);
	});
});

test("halves section top padding and updates it when the viewport changes", () => {
	reduceTitleTopSpacing(titleElement);
	expect(
		section.style.getPropertyValue("--ebr-reference-title-padding-top"),
	).toBe("10px");
	section.style.paddingTop = "40px";
	window.dispatchEvent(new Event("resize"));
	expect(
		section.style.getPropertyValue("--ebr-reference-title-padding-top"),
	).toBe("20px");
});
