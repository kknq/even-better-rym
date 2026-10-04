import { runModule } from "~/shared/page-settings";

import { main } from "./app";

await runModule("releaseSubmission", async () => {
	await main();
});
