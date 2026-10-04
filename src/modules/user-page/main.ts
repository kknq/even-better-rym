import { runModule } from "~/shared/page-settings";

import { main } from "./app";

await runModule("userPage", async () => {
	await main();
});
