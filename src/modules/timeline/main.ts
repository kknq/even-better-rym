import { runPage } from "~/shared/page-settings";

import { main } from "./app";

await runPage("timeline", async () => {
	await main();
});
