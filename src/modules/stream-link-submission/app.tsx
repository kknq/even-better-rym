import { render } from "preact";

import { waitForElement } from "~/shared/utils/dom";

import { StreamLinkConverter } from "./stream-link-converter";
import { enableTidalLinkConversion } from "./tidal-links";

export async function injectStreamLinkConverter() {
	const input = await waitForElement<HTMLInputElement>("input#form_media_url");
	const form = input.form;
	const fieldSection = input.parentElement;
	const rulesSection = form
		?.querySelector<HTMLInputElement>("#accept_rules")
		?.closest("label")?.parentElement;
	const submitSection = form?.querySelector("#submit_btn")?.parentElement;
	if (
		form &&
		fieldSection?.parentElement === form &&
		rulesSection?.parentElement === form
	) {
		fieldSection.style.paddingBottom = "0.25em";
		rulesSection.style.paddingTop = "0.25em";
	}
	if (
		form &&
		rulesSection?.parentElement === form &&
		submitSection?.parentElement === form
	) {
		rulesSection.style.paddingBottom = "0.25em";
		submitSection.style.paddingTop = "0.25em";
		submitSection.style.paddingBottom = "0.25em";
	}

	const response = form?.nextElementSibling;
	const spacer = response?.nextElementSibling;
	const heading = spacer?.nextElementSibling;
	if (
		response?.id === "submit_response_msg" &&
		spacer instanceof HTMLBRElement &&
		heading instanceof HTMLElement &&
		heading.nextElementSibling?.id === "media_link_list"
	) {
		spacer.hidden = true;
	}

	const row = document.createElement("div");
	Object.assign(row.style, {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: "8px",
	});
	Object.assign(input.style, {
		flex: "1 1 600px",
		maxWidth: "600px",
		minWidth: "0",
		width: "100%",
		boxSizing: "border-box",
		display: "block",
	});
	input.before(row);
	row.append(input);

	const app = document.createElement("div");
	app.id = "even-better-rym";
	row.append(app);

	enableTidalLinkConversion(input, row);
	render(<StreamLinkConverter input={input} />, app);
}
