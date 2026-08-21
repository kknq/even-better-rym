import { runPage } from "~/shared/page-settings";

import { main } from "./app";

await runPage("hideVotes", async () => {
	await main();
});
