import { runPage } from "~/shared/page-settings";

import { main } from "./app";

await runPage("trackTime", async () => {
	await main();
});
