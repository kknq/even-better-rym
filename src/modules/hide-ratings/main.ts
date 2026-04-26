import { runPage } from "~/shared/page-settings";
import { main } from "./app";

await runPage("hideRatings", async () => {
	await main();
});
