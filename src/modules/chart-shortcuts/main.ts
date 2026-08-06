import { runPage } from "~/shared/page-settings";

import { main } from "./app";

await runPage("chartShortcuts", async () => {
	await main();
});
