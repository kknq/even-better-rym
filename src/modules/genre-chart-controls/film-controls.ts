import {
	combineYearRanges,
	decadeRange,
	type YearRange,
	yearRange,
} from "~/shared/chart-date-range";
import { waitForElement } from "~/shared/utils/dom";

const GENRES_NEEDING_SUFFIX = new Set([
	"comedy",
	"experimental",
	"satire",
	"postmodernism",
]);

const MIN_YEAR = 1890;
const MAX_YEAR = new Date().getFullYear();

type ChartType = "top" | "popular" | "esoteric" | "diverse";
type DateMode = "all_time" | "year_decade" | "year_range";

type FilmChartState = {
	chartType: ChartType;
	dateMode: DateMode;
	startYear: number | null;
	endYear: number | null;
};

function formatGenreName(path: string, toFilmGenre = false): string {
	const genre = path.split("/")[2]?.toLowerCase() ?? "";
	if (toFilmGenre) {
		return genre.replace("-1", "").replaceAll("-", "+");
	}
	const normalized = genre.replaceAll("+", "-");
	return GENRES_NEEDING_SUFFIX.has(normalized) ? `${normalized}-1` : normalized;
}

function chartTypeLabel(chartType: ChartType): string {
	return chartType.charAt(0).toUpperCase() + chartType.slice(1);
}

function datePath(state: FilmChartState): string {
	if (state.startYear === null || state.endYear === null) {
		return "all-time";
	}
	if (state.startYear === state.endYear) {
		return String(state.startYear);
	}
	if (state.startYear % 10 === 0 && state.endYear === state.startYear + 9) {
		return `${state.startYear}s`;
	}
	return `${state.startYear}-${state.endYear}`;
}

function dateLabel(state: FilmChartState): string {
	const path = datePath(state);
	return path === "all-time" ? "All-time" : path;
}

function makeYearChooser(): string {
	const newestDecade = Math.floor(MAX_YEAR / 10) * 10;
	const oldestDecade = Math.floor(MIN_YEAR / 10) * 10;
	const rows: string[] = [];

	for (let decade = newestDecade; decade >= oldestDecade; decade -= 10) {
		const validYears: number[] = [];
		for (let year = decade; year <= decade + 9; year += 1) {
			if (year >= MIN_YEAR && year <= MAX_YEAR) {
				validYears.push(year);
			}
		}

		const yearWidth = validYears.length === 10 ? 8 : 80 / validYears.length;
		const years = validYears.map(
			(year) =>
				`<button type="button" class="ebr-film-chart-year" data-year="${year}" style="width:${yearWidth.toFixed(2)}%">${String(year).slice(-2)}</button>`,
		);

		rows.push(`
			<div class="ebr-film-chart-year-row">
				<button type="button" class="ebr-film-chart-decade" data-decade="${decade}">${decade}s</button>
				${years.join("")}
			</div>
		`);
	}
	return rows.join("");
}

function controlsHtml(): string {
	return `
		<div class="ebr-film-genre-chart-control-frame">
			<button type="button" class="ebr-film-genre-chart-control" data-control="chart-type">
				<span id="ebr-film-chart-type-title">Top</span><i class="fa fa-caret-down"></i>
			</button>
			<div class="ebr-film-chart-menu" id="ebr-film-chart-type-menu">
				${(
					[
						["top", "Top", "As determined by users' ratings"],
						["popular", "Popular", "Most number of ratings"],
						[
							"esoteric",
							"Esoteric",
							"Relatively unknown but with high average ratings",
						],
						[
							"diverse",
							"Diverse",
							"Directors are limited to one entry per chart",
						],
					] as const
				)
					.map(
						([value, label, description]) => `
							<button type="button" class="ebr-film-chart-option${value === "top" ? " is-selected" : ""}" data-chart-type="${value}">
								<div class="ebr-film-chart-option-icon"><i class="fa fa-circle"></i><i class="far fa-circle"></i></div>
								<div class="ebr-film-chart-option-title">${label}</div>
								<div class="ebr-film-chart-option-description">${description}</div>
							</button>`,
					)
					.join("")}
			</div>
		</div>

		<span class="ebr-film-genre-chart-label">of</span>

		<div class="ebr-film-genre-chart-control-frame">
			<button type="button" class="ebr-film-genre-chart-control" data-control="date">
				<span id="ebr-film-chart-date-title">All-time</span><i class="fa fa-caret-down"></i>
			</button>
			<div class="ebr-film-chart-menu ebr-film-chart-date-menu" id="ebr-film-chart-date-menu" data-mode="all_time">
				<button type="button" class="ebr-film-chart-option is-selected" data-date-mode="all_time">
					<div class="ebr-film-chart-option-icon"><i class="fa fa-circle"></i><i class="far fa-circle"></i></div>
					<div class="ebr-film-chart-option-title">All-time</div>
					<div class="ebr-film-chart-option-description">Charts from all-time</div>
				</button>
				<button type="button" class="ebr-film-chart-option" data-date-mode="year_decade">
					<div class="ebr-film-chart-option-icon"><i class="fa fa-circle"></i><i class="far fa-circle"></i></div>
					<div class="ebr-film-chart-option-title">Specific year or decade</div>
					<div class="ebr-film-chart-option-description">Ex. &quot;1984&quot;, &quot;2010s&quot;</div>
				</button>
				<button type="button" class="ebr-film-chart-option" data-date-mode="year_range">
					<div class="ebr-film-chart-option-icon"><i class="fa fa-circle"></i><i class="far fa-circle"></i></div>
					<div class="ebr-film-chart-option-title">Year range</div>
					<div class="ebr-film-chart-option-description">Ex. &quot;1984-2016&quot;</div>
				</button>
				<div class="ebr-film-chart-date-help" id="ebr-film-chart-date-help">Charts include films from all years.</div>
				<div class="ebr-film-chart-year-chooser">${makeYearChooser()}</div>
				<div class="ebr-film-chart-close"><button type="button">Close</button></div>
			</div>
		</div>
	`;
}

function updateControls(
	state: FilmChartState,
	button: HTMLAnchorElement,
	genre: string,
): void {
	const chartTypeTitle = document.getElementById("ebr-film-chart-type-title");
	const dateTitle = document.getElementById("ebr-film-chart-date-title");
	if (chartTypeTitle)
		chartTypeTitle.textContent = chartTypeLabel(state.chartType);
	if (dateTitle) dateTitle.textContent = dateLabel(state);

	button.href = `/charts/${state.chartType}/film/${datePath(state)}/g:${genre}`;

	document
		.querySelectorAll<HTMLElement>("[data-chart-type]")
		.forEach((option) => {
			option.classList.toggle(
				"is-selected",
				option.dataset.chartType === state.chartType,
			);
		});

	document
		.querySelectorAll<HTMLElement>("[data-date-mode]")
		.forEach((option) => {
			option.classList.toggle(
				"is-selected",
				option.dataset.dateMode === state.dateMode,
			);
		});

	const dateMenu = document.getElementById("ebr-film-chart-date-menu");
	if (dateMenu) dateMenu.dataset.mode = state.dateMode;

	const help = document.getElementById("ebr-film-chart-date-help");
	if (help) {
		help.textContent =
			state.dateMode === "all_time"
				? "Charts include films from all years."
				: state.dateMode === "year_range"
					? "Choose the first year or decade, then choose the second."
					: "Choose a single year or an entire decade.";
	}

	document
		.querySelectorAll<HTMLElement>("[data-year]")
		.forEach((yearButton) => {
			const year = Number(yearButton.dataset.year);
			const selected =
				state.startYear !== null &&
				state.endYear !== null &&
				year >= state.startYear &&
				year <= state.endYear;
			yearButton.classList.toggle("is-selected", selected);
		});

	document
		.querySelectorAll<HTMLElement>("[data-decade]")
		.forEach((decadeButton) => {
			const decade = Number(decadeButton.dataset.decade);
			decadeButton.classList.toggle(
				"is-selected",
				state.startYear === decade && state.endYear === decade + 9,
			);
		});
}

function wireControls(
	controls: HTMLElement,
	state: FilmChartState,
	button: HTMLAnchorElement,
	genre: string,
): void {
	const chartTypeMenu = controls.querySelector<HTMLElement>(
		"#ebr-film-chart-type-menu",
	);
	const dateMenu = controls.querySelector<HTMLElement>(
		"#ebr-film-chart-date-menu",
	);
	let rangeStart: YearRange | null = null;

	const closeMenus = () => {
		chartTypeMenu?.classList.remove("is-open");
		dateMenu?.classList.remove("is-open");
	};

	const toggleMenu = (menu: HTMLElement | null) => {
		if (!menu) return;
		const opening = !menu.classList.contains("is-open");
		closeMenus();
		if (opening) {
			menu.classList.add("is-open");
		}
	};

	controls
		.querySelector<HTMLElement>('[data-control="chart-type"]')
		?.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			toggleMenu(chartTypeMenu ?? null);
		});

	controls
		.querySelector<HTMLElement>('[data-control="date"]')
		?.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			toggleMenu(dateMenu ?? null);
		});

	// Delegate menu selection from the controls root. This avoids the old film
	// breadcrumb swallowing/interfering with listeners attached to individual
	// option descendants.
	controls.addEventListener("click", (event) => {
		const target = event.target as HTMLElement | null;
		const option = target?.closest<HTMLElement>(
			"[data-chart-type], [data-date-mode]",
		);
		if (!option || !controls.contains(option)) return;

		event.preventDefault();
		event.stopPropagation();

		if (option.dataset.chartType) {
			state.chartType = option.dataset.chartType as ChartType;
			updateControls(state, button, genre);
			closeMenus();
			return;
		}

		if (option.dataset.dateMode) {
			state.dateMode = option.dataset.dateMode as DateMode;
			rangeStart = null;
			if (state.dateMode === "all_time") {
				state.startYear = null;
				state.endYear = null;
				updateControls(state, button, genre);
				closeMenus();
				return;
			}
			updateControls(state, button, genre);
		}
	});

	controls
		.querySelectorAll<HTMLElement>("[data-year]")
		.forEach((yearButton) => {
			yearButton.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				const year = Number(yearButton.dataset.year);
				if (!Number.isFinite(year)) return;

				if (state.dateMode === "year_range") {
					const selectedRange = yearRange(year);
					if (rangeStart === null) {
						rangeStart = selectedRange;
						state.startYear = selectedRange.start;
						state.endYear = selectedRange.end;
					} else {
						const range = combineYearRanges(rangeStart, selectedRange);
						state.startYear = range.start;
						state.endYear = range.end;
						rangeStart = null;
					}
				} else {
					state.startYear = year;
					state.endYear = year;
				}
				updateControls(state, button, genre);
			});
		});

	controls
		.querySelectorAll<HTMLElement>("[data-decade]")
		.forEach((decadeButton) => {
			decadeButton.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				const decade = Number(decadeButton.dataset.decade);
				if (!Number.isFinite(decade)) return;

				if (state.dateMode === "year_range") {
					const selectedRange = decadeRange(decade);
					if (rangeStart === null) {
						rangeStart = selectedRange;
						state.startYear = selectedRange.start;
						state.endYear = selectedRange.end;
					} else {
						const range = combineYearRanges(rangeStart, selectedRange);
						state.startYear = range.start;
						state.endYear = range.end;
						rangeStart = null;
					}
				} else {
					state.startYear = decade;
					state.endYear = decade + 9;
				}
				updateControls(state, button, genre);
			});
		});

	controls
		.querySelector<HTMLElement>(".ebr-film-chart-close button")
		?.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			closeMenus();
		});

	document.addEventListener("click", (event) => {
		const target = event.target as Node | null;
		if (target && !controls.contains(target)) closeMenus();
	});
}

export async function mainChart(): Promise<void> {
	await waitForElement<HTMLAnchorElement>("a.genre");
	document.querySelectorAll<HTMLAnchorElement>("a.genre").forEach((link) => {
		link.href = `/film_genre/${formatGenreName(link.pathname, true)}`;
	});
}

export async function mainFilmGenre(): Promise<void> {
	const breadcrumb = await waitForElement<HTMLElement>("#page_breadcrumb");

	if (breadcrumb.querySelector(".ebr-film-genre-chart-controls")) {
		return;
	}

	const genre = formatGenreName(globalThis.location.pathname);
	const state: FilmChartState = {
		chartType: "top",
		dateMode: "all_time",
		startYear: null,
		endYear: null,
	};

	const controls = document.createElement("span");
	controls.className = "ebr-film-genre-chart-controls";
	controls.insertAdjacentHTML("beforeend", controlsHtml());

	const button = document.createElement("a");
	button.textContent = "See Film chart";
	button.className = "ebr-film-genre-chart-link ui_button";
	controls.appendChild(button);

	breadcrumb.appendChild(controls);
	wireControls(controls, state, button, genre);
	updateControls(state, button, genre);
}
