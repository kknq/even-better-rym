import { runModule } from "~/shared/page-settings";

import { injectCoverArtDownloader } from "./app";

await runModule("coverArt", async () => {
	await injectCoverArtDownloader();
});
