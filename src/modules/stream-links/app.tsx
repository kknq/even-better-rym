import { render } from "preact";

import { getStreamLinkSettings } from "~/shared/stream-links/settings";
import { waitForElement } from "~/shared/utils/dom";

import { insertStreamLinks } from "./placement";
import { StreamLinks } from "./stream-links";

export const main = async () => {
	const app = document.createElement("div");
	app.id = "even-better-rym";

	try {
		const siblingElement = await waitForElement(
			'.hide-for-small a[href^="buy"]',
		);
		siblingElement.after(app);
	} catch {
		const siblingElement = await waitForElement<HTMLElement>(
			".page_release_art_frame .hide-for-small",
		);
		insertStreamLinks(siblingElement, app);
	}

	const settings = await getStreamLinkSettings();
	render(<StreamLinks settings={settings} />, app);
};
