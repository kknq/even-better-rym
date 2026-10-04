import { runModule } from "~/shared/page-settings";

import { main } from "./app";

await runModule("timeline", async () => {
	await main();
});
