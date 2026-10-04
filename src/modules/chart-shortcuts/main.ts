import { runModule } from "~/shared/page-settings";

import { main } from "./app";

await runModule("chartShortcuts", async () => {
	await main();
});
