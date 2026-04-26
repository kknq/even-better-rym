import { runPage } from "~/shared/page-settings";

import { main } from "./app";

await runPage("descriptorLinks", async () => {
	await main();
});
