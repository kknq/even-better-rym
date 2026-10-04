import { runModule } from "~/shared/page-settings";

import { main } from "./app";

await runModule("descriptorLinks", async () => {
	await main();
});
