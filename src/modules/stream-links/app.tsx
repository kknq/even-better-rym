import { render } from "preact";

import { waitForElement } from "~/shared/utils/dom";

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
		const siblingElement = await waitForElement(
			".page_release_art_frame .hide-for-small",
		);
		siblingElement.prepend(app);
	}

	render(<StreamLinks />, app);
};
