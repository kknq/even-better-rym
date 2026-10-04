import { runModule } from "~/shared/page-settings";

import { main } from "./app";

await runModule("streamLinks", async () => {
	await main();
});
