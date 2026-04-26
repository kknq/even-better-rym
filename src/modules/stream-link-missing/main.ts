import { runPage } from "~/shared/page-settings";

import { main } from "./app";

await runPage("streamLinkMissing", async () => {
	await main();
});
