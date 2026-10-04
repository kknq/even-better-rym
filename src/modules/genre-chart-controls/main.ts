import { runModule } from "~/shared/page-settings";
import { mainChart, mainFilmGenre } from "./film-controls";
import { mainMusicGenre } from "./music-genre-controls";

const pathname = globalThis.location.pathname;

if (pathname.startsWith("/charts/")) {
	void runModule("genreChartControls", mainChart);
} else if (pathname.startsWith("/film_genre/")) {
	void runModule("genreChartControls", mainFilmGenre);
} else {
	void runModule("genreChartControls", mainMusicGenre);
}
