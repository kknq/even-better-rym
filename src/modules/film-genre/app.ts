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

const STYLE = `
	/* =========================================================
	 * Breadcrumb / controls layout
	 * ======================================================= */

	.ui_breadcrumb_frame,
	#page_breadcrumb {
		overflow: visible !important;
	}

	.ui_breadcrumb_frame {
		position: relative;
		z-index: 7100;
	}

	.ebr-film-genre-chart-controls {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: .25em;
		margin-left: auto;
		float: right;
		position: relative;
		z-index: 7101;
		white-space: nowrap;
	}

	.ebr-film-genre-chart-control-frame {
		position: static;
	}


	/* =========================================================
	 * Top / date / See Film chart buttons
	 * ======================================================= */

	.ebr-film-genre-chart-control,
	.ebr-film-genre-chart-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;

		height: 37.5px !important;
		box-sizing: border-box;
		padding: 0 15px !important;

		border: 0;
		border-radius: 4.5px;

		background: #b78424;
		color: #FFFFFF !important;

		font-family: inherit;
		font-size: 15px !important;
		font-weight: bold;
		line-height: 1 !important;

		cursor: pointer;
		user-select: none;
	}

	.ebr-film-genre-chart-control:hover,
	.ebr-film-genre-chart-link:hover {
		background: #a4680d;
		color: #FFFFFF !important;
	}

	.ebr-film-genre-chart-control i {
		margin-left: .4em;
	}

	.ebr-film-genre-chart-label {
		padding: 0 3.75px;
		color: var(--text-secondary);
		font-size: 15px !important;
		line-height: 37.5px;
	}

	.ebr-film-genre-chart-link {
		width: 143px;
		margin-left: 11.25px !important;
		text-decoration: none;
	}


	/* =========================================================
	 * Generic dropdown
	 *
	 * Keep the chart-type dropdown at the existing larger size.
	 * The date menu gets its own RYM-sized override below.
	 * ======================================================= */

	.ebr-film-chart-menu {
		display: none;
		position: absolute;

		left: auto;
		right: 0;
		top: 3.2em;

		width: 448px;
		max-width: calc(100vw - 24px);

		font-size: 15px;
		line-height: 1;

		background: var(--surface-primary);
		border: 1px solid var(--ui-divider-line);
		box-shadow: 0 2px 8px rgba(0, 0, 0, .25);

		z-index: 7200;
		pointer-events: auto;

		white-space: normal;
		text-align: left;
	}

	.ebr-film-chart-menu.is-open {
		display: block;
	}


	/* =========================================================
	 * Date dropdown
	 *
	 * Match RYM's native date menu:
	 * outer menu ≈ 351px
	 * inner content ≈ 349px
	 * ======================================================= */

	.ebr-film-chart-date-menu {
		width: 351px;
		min-width: 351px;
		max-width: calc(100vw - 24px);

		font-size: 14px;
		line-height: 14px;
	}


	/* =========================================================
	 * Generic dropdown options
	 * ======================================================= */

	.ebr-film-chart-option {
		display: block;
		width: 100%;
		min-height: 66.75px;
		box-sizing: border-box;

		padding: 12px 15px;

		border: 0;
		border-top: 1px solid var(--ui-divider-line);

		background: transparent;
		color: var(--text-primary);

		font: inherit;
		text-align: left;

		cursor: pointer;
		pointer-events: auto;
	}

	.ebr-film-chart-option:first-child {
		border-top: 0;
	}

	.ebr-film-chart-option:hover {
		background: var(--surface-tertiary);
	}

	.ebr-film-chart-option-icon {
		float: left;
		width: 3em;

		font-size: 1.2em;
		line-height: 1.5;
		text-align: center;
	}

	.ebr-film-chart-option-icon .fa.fa-circle {
		display: none;
	}

	.ebr-film-chart-option-icon .far.fa-circle {
		display: inline;
	}

	.ebr-film-chart-option.is-selected
		.ebr-film-chart-option-icon
		.fa.fa-circle {
		display: inline;
	}

	.ebr-film-chart-option.is-selected
		.ebr-film-chart-option-icon
		.far.fa-circle {
		display: none;
	}

	.ebr-film-chart-option-title {
		margin-left: 45px;

		font-size: 18px;
		line-height: 1.15;
	}

	.ebr-film-chart-option-description {
		margin-top: 4px;
		margin-left: 54px;

		color: var(--text-secondary);

		font-size: 14px;
		line-height: 1.15;
	}


	/* =========================================================
	 * Date menu option overrides
	 *
	 * RYM's native date rows are ≈349 × 61px.
	 * ======================================================= */

	.ebr-film-chart-date-menu .ebr-film-chart-option {
		width: 349px;
		min-height: 61px;

		padding: 14px;

		font-size: 14px;
		line-height: 14px;
	}

	.ebr-film-chart-date-menu .ebr-film-chart-option-title {
		margin-left: 49px;

		font-size: 16px;
		line-height: 16px;
	}

	.ebr-film-chart-date-menu .ebr-film-chart-option-description {
		margin-top: 4px;
		margin-left: 49px;

		font-size: 14px;
		line-height: 14px;
	}


	/* =========================================================
	 * Date help
	 * ======================================================= */

	.ebr-film-chart-date-help {
		width: 349px;
		box-sizing: border-box;

		padding: 10px 14px;

		background: var(--surface-secondary);
		color: var(--text-secondary);

		font-size: 14px;
		line-height: 1.25;
	}


	/* =========================================================
	 * Year / decade chooser
	 *
	 * Native RYM dimensions:
	 * chooser: 349px
	 * row:     22px
	 * decade:  ~69px
	 * year:    ~28px for complete decades
	 * ======================================================= */

	.ebr-film-chart-year-chooser {
		display: none;

		width: 349px;
		max-width: 349px;
		box-sizing: border-box;

		margin: 4px 0 14px;

		overflow: hidden;

		background: var(--mono-fc);

		border: 0;
		border-radius: 4px;

		font-size: 11px;
		line-height: 11px;
		white-space: nowrap;
	}

	.ebr-film-chart-date-menu[data-mode="year_decade"]
		.ebr-film-chart-year-chooser,
	.ebr-film-chart-date-menu[data-mode="year_range"]
		.ebr-film-chart-year-chooser {
		display: block;
	}

	.ebr-film-chart-year-row {
		display: flex;
		align-items: stretch;

		width: 100%;
		height: 22px;
		box-sizing: border-box;

		border-bottom: 1px solid rgba(128, 128, 128, .2);
	}

	.ebr-film-chart-year-row:last-child {
		border-bottom: 0;
	}

	.ebr-film-chart-decade,
	.ebr-film-chart-year {
		appearance: none;
		-webkit-appearance: none;

		display: flex;
		align-items: center;
		justify-content: center;

		flex: 0 0 auto;

		box-sizing: border-box;
		height: 22px;
		min-height: 22px;

		margin: 0;
		padding: 5px 1px;

		font-family: inherit;
		font-size: 11px;
		font-weight: normal;
		line-height: 11px;

		text-align: center;
		white-space: nowrap;

		color: var(--mono-a);
		background: var(--mono-fc);

		cursor: pointer;
		user-select: none;

		border: 0;
		border-right: 1px solid rgba(128, 128, 128, .2);
		border-radius: 0;

		box-shadow: none;
	}

	.ebr-film-chart-decade {
		width: 20%;
		font-weight: bold;
	}

	.ebr-film-chart-year {
		width: 8%;
	}

	.ebr-film-chart-decade:hover,
	.ebr-film-chart-year:hover {
		color: var(--text-primary);
		background: var(--surface-tertiary);
	}

	.ebr-film-chart-decade.is-selected,
	.ebr-film-chart-year.is-selected {
		color: #FFFFFF;
		background: #b78424;
		font-weight: bold;
	}


	/* =========================================================
	 * Close button
	 * ======================================================= */

	.ebr-film-chart-close {
		width: 349px;
		box-sizing: border-box;
		padding: .5em 1em 1em;
		text-align: center;
	}

	.ebr-film-chart-close button {
		padding: .5em 1em;

		background: #b78424;
		color: #FFFFFF;

		border: 0;
		border-radius: .3em;

		font: inherit;

		cursor: pointer;
	}

	.ebr-film-chart-close button:hover {
		background: #a4680d;
	}


	/* =========================================================
	 * Responsive
	 * ======================================================= */

	@media only screen and (max-width: 48.1em) {
		.ebr-film-genre-chart-controls {
			overflow-x: auto;
			max-width: 100%;
			scrollbar-width: none;
		}

		.ebr-film-genre-chart-controls::-webkit-scrollbar {
			display: none;
		}
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
		.forEach((option) =>
			option.classList.toggle(
				"is-selected",
				option.dataset.chartType === state.chartType,
			),
		);

	document
		.querySelectorAll<HTMLElement>("[data-date-mode]")
		.forEach((option) =>
			option.classList.toggle(
				"is-selected",
				option.dataset.dateMode === state.dateMode,
			),
		);

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
	let rangeStart: number | null = null;

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
					if (rangeStart === null) {
						rangeStart = year;
						state.startYear = year;
						state.endYear = year;
					} else {
						state.startYear = Math.min(rangeStart, year);
						state.endYear = Math.max(rangeStart, year);
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
					if (rangeStart === null) {
						rangeStart = decade;
						state.startYear = decade;
						state.endYear = decade + 9;
					} else {
						state.startYear = Math.min(rangeStart, decade);
						state.endYear = Math.max(rangeStart, decade + 9);
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

	if (!document.getElementById("ebr-film-genre-chart-controls-style")) {
		const style = document.createElement("style");
		style.id = "ebr-film-genre-chart-controls-style";
		style.textContent = STYLE;
		document.head.appendChild(style);
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
