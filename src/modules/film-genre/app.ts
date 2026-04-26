import { waitForElement } from "~/shared/utils/dom";

const GENRES_NEEDING_SUFFIX = new Set(["comedy", "experimental", "satire"]);

const STYLE = `
	.ebr-film-genre-chart-link {
		display: inline-block;
		float: right;
		background: #b78424;
		color: #FFFFFF !important;
	}
	.ebr-film-genre-chart-link:hover {
		background: #a4680d;
	}
`;

function formatGenreName(path: string, toFilmGenre = false): string {
	const genre = path.split("/")[2]?.toLowerCase() ?? "";
	if (toFilmGenre) {
		return genre.replace("-1", "").replaceAll("-", "+");
	}
	const normalized = genre.replaceAll("+", "-");
	return GENRES_NEEDING_SUFFIX.has(normalized) ? `${normalized}-1` : normalized;
}

export async function mainChart(): Promise<void> {
	await waitForElement<HTMLAnchorElement>("a.genre");
	document.querySelectorAll<HTMLAnchorElement>("a.genre").forEach((link) => {
		link.href = `/film_genre/${formatGenreName(link.pathname, true)}`;
	});
}

export async function mainFilmGenre(): Promise<void> {
	const breadcrumb = await waitForElement<HTMLElement>("#page_breadcrumb");

	const style = document.createElement("style");
	style.textContent = STYLE;
	document.head.appendChild(style);

	const button = document.createElement("a");
	button.textContent = "View genre chart";
	button.href = `/charts/top/film/all-time/g:${formatGenreName(window.location.pathname)}`;
	button.className = "ebr-film-genre-chart-link ui_button";

	breadcrumb.appendChild(button);
}
