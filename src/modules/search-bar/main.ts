import { runModule } from "~/shared/page-settings";

import { main } from "./app";

await runModule("searchBar", async () => {
	await main();
});
