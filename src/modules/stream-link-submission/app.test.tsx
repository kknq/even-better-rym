// @vitest-environment jsdom

import { expect, test, vi } from "vitest";

import { injectStreamLinkConverter } from "./app";

vi.mock("~/shared/utils/dom", () => ({
	waitForElement: () =>
		Promise.resolve(document.querySelector("#form_media_url")),
}));
vi.mock("./stream-link-converter", () => ({
	StreamLinkConverter: () => null,
}));

test("places the embed controls beside the URL field and the hint below it", async () => {
	document.body.innerHTML = '<form><input id="form_media_url"></form>';
	await injectStreamLinkConverter();

	const input = document.querySelector<HTMLInputElement>("#form_media_url");
	const row = input?.parentElement;
	const notice = row?.nextElementSibling as HTMLElement | null;
	expect(notice?.getAttribute("role")).toBe("status");
	expect(notice?.style.color).toBe("rgb(66, 134, 196)");
	expect(notice?.style.fontSize).toBe("0.85em");
	expect(row?.style.display).toBe("flex");
	expect(row?.style.flexWrap).toBe("wrap");
	expect(row?.style.alignItems).toBe("center");
	expect(input?.style.maxWidth).toBe("600px");
	expect(input?.style.width).toBe("100%");
	expect(input?.style.display).toBe("block");
	expect(input?.nextElementSibling?.id).toBe("even-better-rym");
	expect(notice?.style.maxWidth).toBe("600px");
	expect(input?.form).toBe(document.querySelector("form"));
});

test("reduces spacing between the field, checkbox, submit button and media links", async () => {
	document.body.innerHTML = `
		<form>
			<div id="field-section" style="padding: 1em">
				<div>URL / Embed code:</div>
				<input id="form_media_url">
			</div>
			<div id="rules-section" style="padding: 1em">
				<label for="accept_rules"><input type="checkbox" id="accept_rules"> I confirm the rules</label>
			</div>
			<div id="submit-section" style="padding: 1em"><input type="button" id="submit_btn"></div>
		</form>
		<div id="submit_response_msg" style="display: none"></div>
		<br id="media-spacer">
		<div id="media-heading">Media links:</div>
		<div id="media_link_list"><table></table></div>`;
	await injectStreamLinkConverter();

	const fieldSection = document.querySelector<HTMLElement>("#field-section");
	const rulesSection = document.querySelector<HTMLElement>("#rules-section");
	const submitSection = document.querySelector<HTMLElement>("#submit-section");
	const spacer = document.querySelector<HTMLElement>("#media-spacer");
	expect(fieldSection?.style.paddingBottom).toBe("0.25em");
	expect(fieldSection?.style.paddingTop).toBe("1em");
	expect(rulesSection?.style.paddingTop).toBe("0.25em");
	expect(rulesSection?.style.paddingBottom).toBe("0.25em");
	expect(submitSection?.style.paddingTop).toBe("0.25em");
	expect(submitSection?.style.paddingBottom).toBe("0.25em");
	expect(submitSection?.style.paddingLeft).toBe("1em");
	expect(spacer?.hidden).toBe(true);
	expect(document.querySelector("#media-heading")?.textContent).toBe(
		"Media links:",
	);
});
