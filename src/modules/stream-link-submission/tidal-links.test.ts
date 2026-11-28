// @vitest-environment jsdom

import { beforeEach, expect, test, vi } from "vitest";

import { enableTidalLinkConversion } from "./tidal-links";

let input: HTMLInputElement;
let form: HTMLFormElement;
let notice: HTMLElement;

beforeEach(() => {
	document.body.innerHTML = `
		<form action="/submit_media_link">
			<input type="text" name="media_url" id="form_media_url">
			<input type="button" value="Submit" id="submit_btn">
		</form>`;
	const field = document.querySelector<HTMLInputElement>("#form_media_url");
	const submissionForm = document.querySelector<HTMLFormElement>("form");
	if (!field || !submissionForm) throw new Error("Missing submission form");
	input = field;
	form = submissionForm;
	enableTidalLinkConversion(input);
	const status = document.querySelector<HTMLElement>('[role="status"]');
	if (!status) throw new Error("Missing conversion notice");
	notice = status;
});

function enter(value: string) {
	input.value = value;
	input.dispatchEvent(new Event("input", { bubbles: true }));
}

test("announces conversion without interrupting typing and converts on blur", () => {
	enter("https://tidal.com/album/saturnian-bloodstorm/2");
	expect(input.value).toBe("https://tidal.com/album/saturnian-bloodstorm/2");
	expect(notice.textContent).toContain("will be converted");
	enter("https://tidal.com/album/saturnian-bloodstorm/269898965");
	expect(notice.textContent).toBe(
		"This link will be converted to https://tidal.com/album/269898965 so RYM can handle it properly.",
	);
	input.dispatchEvent(new Event("blur"));
	expect(input.value).toBe("https://tidal.com/album/269898965");
	expect(notice.textContent).toBe(
		"This link was converted to https://tidal.com/album/269898965 so RYM can handle it properly.",
	);
	enter("https://example.com");
	expect(notice.textContent).toBe("");
	expect(notice.hidden).toBe(true);
});

test("converts before RYM's submit button handler runs", () => {
	const submit = document.querySelector<HTMLInputElement>("#submit_btn");
	if (!submit) throw new Error("Missing submit button");
	const handler = vi.fn(() => input.value);
	submit.addEventListener("click", handler);
	enter("https://tidal.com/album/saturnian-bloodstorm/269898965");
	submit.click();
	expect(handler).toHaveReturnedWith("https://tidal.com/album/269898965");
});

test("converts before a form submit handler runs", () => {
	const handler = vi.fn(() => input.value);
	form.addEventListener("submit", handler);
	enter("https://www.tidal.com/browse/album/example/123/?utm_source=share");
	form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
	expect(handler).toHaveReturnedWith("https://tidal.com/album/123");
});

test.each([
	"https://tidal.com/album/269898965",
	"https://tidal.com/album/269898965/credits",
	"https://tidal.com/track/example/123",
	"https://tidal.com.evil.example/album/example/123",
	"https://example.com/album/example/123",
	"https://tidal.com/album/example/not-a-number",
	"https://tidal.com/album/example/123/track/456",
	"<iframe src='https://tidal.com/album/example/123'></iframe>",
])("leaves unsupported and already compatible input unchanged: %s", (value) => {
	enter(value);
	input.dispatchEvent(new Event("blur"));
	expect(input.value).toBe(value);
	expect(notice.textContent).toBe("");
});

test("recognizes a link already present when the helper loads", () => {
	input.value = "https://tidal.com/album/example/123";
	document.body.innerHTML = `<form><input id="form_media_url" value="${input.value}"></form>`;
	const existing = document.querySelector<HTMLInputElement>("#form_media_url");
	if (!existing) throw new Error("Missing URL input");
	enableTidalLinkConversion(existing);
	expect(document.querySelector('[role="status"]')?.textContent).toContain(
		"will be converted",
	);
	existing.dispatchEvent(new Event("blur"));
	expect(existing.value).toBe("https://tidal.com/album/123");
});
