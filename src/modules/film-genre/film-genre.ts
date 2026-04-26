import { runPage } from "~/shared/page-settings";

import { mainFilmGenre } from "./app";

await runPage("filmGenreChartButton", async () => {
	await mainFilmGenre();
});
