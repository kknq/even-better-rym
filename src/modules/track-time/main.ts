import { runModule } from "~/shared/page-settings";

import { main } from "./app";

await runModule("trackTime", async () => {
	await main();
});
