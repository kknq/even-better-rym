import { runPage } from "~/shared/page-settings";
import { mainChart, mainFilmGenre } from "./film-controls";
import { mainMusicGenre } from "./music-genre-controls";

const pathname = globalThis.location.pathname;

if (pathname.startsWith("/charts/")) {
	void runPage("genreChartControls", mainChart);
} else if (pathname.startsWith("/film_genre/")) {
	void runPage("genreChartControls", mainFilmGenre);
} else {
	void runPage("genreChartControls", mainMusicGenre);
}
