import { runModule } from "~/shared/page-settings";

import { main } from "./app";

await runModule("hideVotes", async () => {
	await main();
});
