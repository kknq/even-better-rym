import { runPage } from "~/shared/page-settings";

import { injectCoverArtDownloader } from "./app";

await runPage("coverArt", async () => {
	await injectCoverArtDownloader();
});
