import { runPage } from "~/shared/page-settings";

import { mainChart } from "./app";

await runPage("filmChartGenreLinks", async () => {
	await mainChart();
});
