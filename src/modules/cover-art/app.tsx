import { render } from "preact";

import { waitForElement } from "~/shared/utils/dom";

import { CoverArtDownloader } from "./cover-art-downloader";

export async function injectCoverArtDownloader() {
	const siblingElement = await waitForElement("#content_total_cover");

	const app = document.createElement("div");
	app.id = "even-better-rym";
	siblingElement.after(app);

	render(<CoverArtDownloader />, app);
}
