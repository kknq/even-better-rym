import { render } from "preact";

import { waitForElement } from "~/shared/utils/dom";

import { FilterButtons } from "./filter-buttons";

export async function injectCollectionFilterButtons() {
	const siblingElement = await waitForElement(".ui_breadcrumb_frame");

	// filtering doesn't work when you have a tag selected
	if (document.URL.includes("stag")) return;

	const app = document.createElement("div");
	app.id = "even-better-rym";
	siblingElement.after(app);

	const showReleaseTypes =
		!globalThis.location.href.includes("film_collection");

	render(<FilterButtons showReleaseTypes={showReleaseTypes} />, app);
}
