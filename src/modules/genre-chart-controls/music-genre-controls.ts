import {
	combineYearRanges,
	decadeRange,
	type YearRange,
	yearRange,
} from "~/shared/chart-date-range";
import { waitForDocumentReady } from "~/shared/utils/dom";

import { CHART_CONTROLS_HTML } from "./music-genre-markup";

const RELEASE_TYPE_LABELS: Record<string, string> = {
	album: "Album",
	ep: "EP",
	mixtape: "Mixtape",
	djmix: "DJ Mix",
	single: "Single",
	comp: "Compilation",
	video: "Video",
	unauth: "Unauthorized",
	song: "Song",
	musicvideo: "Music Video",
	additional: "Additional Release",
};

type RYMChartState = {
	chart_type?: string;
	chart_object?: string;
	chart_date_range_type?: string;
	release_types?: string[];
	start_date?: number;
	end_date?: number;
};

type RYMChartLike = {
	state: RYMChartState;
	_updateFrameClass?: () => void;
	_updateReleaseTypeValue?: () => void;
	openChartTypeSelect?: () => void;
	closeChartTypeSelect?: () => void;
	onClickChartType?: (event: Event, option: unknown) => boolean;
	openObjectTypeSelect?: () => void;
	closeObjectTypeSelect?: () => void;
	onClickObjectType?: (event: Event, option: unknown) => boolean;
	openDateSelect?: () => void;
	closeDateSelect?: () => void;
	onClickDateType?: (event: Event, option: unknown) => boolean;
	toggleReleaseType?: (type: string) => void;
	selectReleaseTypeAll?: () => void;
	selectReleaseTypeMain?: () => void;
	selectReleaseTypeAlbums?: () => void;
	selectReleaseTypeSingles?: () => void;
	selectReleaseTypeNone?: () => void;
	onMouseDownDateChooserDecade?: (event: Event, year: number) => void;
	onMouseUpDateChooserDecade?: (event: Event, year: number) => void;
	onMouseOverDateChooserDecade?: (event: Event, year: number) => void;
	onMouseDownDateChooserYear?: (event: Event, year: number) => void;
	onMouseUpDateChooserYear?: (event: Event, year: number) => void;
	onMouseOverDateChooserYear?: (event: Event, year: number) => void;
};

const FIRST_CHART_YEAR = 1890;

function populateYearChooser(): void {
	const chooser = document.getElementById("date_year_chooser");
	if (!chooser) return;

	const currentYear = new Date().getFullYear();
	const newestDecade = Math.floor(currentYear / 10) * 10;
	const oldestDecade = Math.floor(FIRST_CHART_YEAR / 10) * 10;
	const rows: string[] = [];

	for (let decade = newestDecade; decade >= oldestDecade; decade -= 10) {
		const years = Array.from({ length: 10 }, (_, offset) => decade + offset)
			.filter((year) => year >= FIRST_CHART_YEAR && year <= currentYear)
			.map(
				(year) =>
					`<div id="date_year_chooser_year_${year}" class="date_year_chooser_year_btn">${year % 100}</div>`,
			)
			.join("");
		rows.push(
			`<div class="date_year_chooser_row"><div id="date_year_chooser_decade_${decade}" class="date_year_chooser_decade_btn">${decade}s</div>${years}</div>`,
		);
	}

	chooser.innerHTML = rows.join("");
}

function ensureOverlay(): void {
	if (document.getElementById("overlay_invisible")) {
		return;
	}

	const overlay = document.createElement("div");
	overlay.id = "overlay_invisible";
	overlay.className = "overlay_invisible";
	document.body.appendChild(overlay);
}

function getRYMChart(): RYMChartLike | null {
	return (window as Window & { RYMchart?: RYMChartLike }).RYMchart ?? null;
}

function getOptionElement(option: unknown): HTMLElement | null {
	if (option instanceof HTMLElement) {
		return option;
	}

	const jqueryLike = option as { 0?: unknown } | null;
	return jqueryLike?.[0] instanceof HTMLElement ? jqueryLike[0] : null;
}

function hideChartMenus(): void {
	document
		.querySelectorAll<HTMLElement>(".chart_ui_filter_list")
		.forEach((menu) => {
			menu.style.display = "none";
		});
}

function showChartMenu(id: string, close: () => void): void {
	hideChartMenus();
	const overlay = document.getElementById("overlay_invisible");
	const menu = document.getElementById(id);
	if (!menu) {
		return;
	}

	menu.style.display = "block";
	if (overlay) {
		overlay.style.display = "block";
		overlay.onclick = close;
	}
}

function closeChartMenus(): void {
	hideChartMenus();
	const overlay = document.getElementById("overlay_invisible");
	if (overlay) {
		overlay.style.display = "none";
		overlay.onclick = null;
	}
}

function updateFrameClass(state: RYMChartState): void {
	const query = document.getElementById("page_chart_query");
	if (!query) {
		return;
	}

	for (const className of Array.from(query.classList)) {
		if (
			className.startsWith("chart_type_") ||
			className.startsWith("object_") ||
			className.startsWith("date_type_")
		) {
			query.classList.remove(className);
		}
	}

	query.classList.add(`chart_type_${state.chart_type ?? "top"}`);
	query.classList.add(`object_${state.chart_object ?? "release"}`);
	query.classList.add(`date_type_${state.chart_date_range_type ?? "all_time"}`);
}

function updateReleaseTypeValue(state: RYMChartState): void {
	const selected = getSelectedReleaseTypes();
	state.release_types = selected;

	const labels: Record<string, string> = {
		album: "Albums",
		ep: "EPs",
		comp: "Compilations",
		single: "Singles",
		video: "Videos",
		unauth: "Unauth/Bootlegs",
		song: "Songs",
		mixtape: "Mixtapes",
		musicvideo: "Music videos",
		djmix: "DJ mixes",
		additional: "Additional releases",
	};

	let title = "Releases";
	if (selected.length === 1) {
		title = labels[selected[0]] ?? "Releases";
	} else if (selected.length === 2) {
		title = `${labels[selected[0]]} and ${labels[selected[1]]}`;
	} else if (selected.length === 10 && !selected.includes("song")) {
		title = "Releases (all)";
	} else if (selected.length >= 3) {
		const firstThree = selected
			.slice(0, 3)
			.map((type) => labels[type] ?? type)
			.join(", ");

		const extraCount = selected.length - 3;

		title = extraCount > 0 ? `${firstThree} (+${extraCount})` : firstThree;
	}

	const objectTitle = document.getElementById(
		"page_chart_query_item_chart_object_title",
	);
	if (objectTitle) {
		objectTitle.textContent = title;
	}
}

function setSelectedReleaseTypes(types: string[], state: RYMChartState): void {
	document.querySelectorAll(".release_type_btn").forEach((button) => {
		button.classList.toggle(
			"selected",
			types.includes((button as HTMLElement).dataset.val ?? ""),
		);
	});
	state.chart_object =
		types.length === 1 && types[0] === "song" ? "song" : "release";
	updateFrameClass(state);
	updateReleaseTypeValue(state);
}

function selectDateRange(
	state: RYMChartState,
	startYear: number,
	endYear: number,
): void {
	state.start_date = startYear * 10000;
	state.end_date = endYear * 10000 + 9999;

	document
		.querySelectorAll(
			".date_year_chooser_decade_btn, .date_year_chooser_year_btn",
		)
		.forEach((button) => {
			button.classList.remove("selected");
		});

	for (let year = startYear; year <= endYear; year += 1) {
		document
			.getElementById(`date_year_chooser_year_${year}`)
			?.classList.add("selected");
	}

	if (startYear % 10 === 0 && endYear === startYear + 9) {
		document
			.getElementById(`date_year_chooser_decade_${startYear}`)
			?.classList.add("selected");
	}

	const title = document.getElementById(
		"page_chart_query_item_chart_date_type_title",
	);
	if (title) {
		title.textContent =
			startYear === endYear
				? String(startYear)
				: startYear % 10 === 0 && endYear === startYear + 9
					? `${startYear}s`
					: `${startYear} - ${endYear}`;
	}
}

function ensureRYMChartController(initialState: RYMChartState): RYMChartLike {
	const existing = getRYMChart();
	if (
		existing?.openChartTypeSelect &&
		existing?.openObjectTypeSelect &&
		existing?.openDateSelect
	) {
		return existing;
	}

	let rangeStart: YearRange | null = null;
	const controller: RYMChartLike = {
		state: { ...initialState },
		_updateFrameClass: () => updateFrameClass(controller.state),
		_updateReleaseTypeValue: () => updateReleaseTypeValue(controller.state),
		openChartTypeSelect: () =>
			showChartMenu("page_chart_query_item_type_select", () =>
				controller.closeChartTypeSelect?.(),
			),
		closeChartTypeSelect: () => closeChartMenus(),
		onClickChartType: (_event, option) => {
			const element = getOptionElement(option);
			if (!element) return false;
			controller.state.chart_type = element.dataset.value ?? "top";
			const title = document.getElementById(
				"page_chart_query_item_chart_type_title",
			);
			if (title) title.textContent = element.dataset.description ?? "Top";
			controller._updateFrameClass?.();
			controller.closeChartTypeSelect?.();
			return false;
		},
		openObjectTypeSelect: () =>
			showChartMenu("page_chart_query_item_chart_object_select", () =>
				controller.closeObjectTypeSelect?.(),
			),
		closeObjectTypeSelect: () => closeChartMenus(),
		onClickObjectType: (_event, option) => {
			const element = getOptionElement(option);
			if (!element) return false;
			const value = element.dataset.value ?? "release";
			controller.state.chart_object = value;
			controller._updateFrameClass?.();
			if (value !== "release") {
				const title = document.getElementById(
					"page_chart_query_item_chart_object_title",
				);
				if (title) title.textContent = element.dataset.description ?? value;
				controller.closeObjectTypeSelect?.();
			} else {
				controller._updateReleaseTypeValue?.();
			}
			return false;
		},
		openDateSelect: () =>
			showChartMenu("page_chart_query_item_date_select", () =>
				controller.closeDateSelect?.(),
			),
		closeDateSelect: () => closeChartMenus(),
		onClickDateType: (_event, option) => {
			const element = getOptionElement(option);
			if (!element) return false;
			const value = element.dataset.value ?? "all_time";
			controller.state.chart_date_range_type = value;
			controller._updateFrameClass?.();
			rangeStart = null;
			if (value === "all_time") {
				controller.state.start_date = 18000000;
				controller.state.end_date = 20999999;
				const title = document.getElementById(
					"page_chart_query_item_chart_date_type_title",
				);
				if (title) title.textContent = "All-time";
				controller.closeDateSelect?.();
			}
			return false;
		},
		toggleReleaseType: (type) => {
			const button = document.getElementById(`release_type_btn_${type}`);
			if (!button) {
				return;
			}

			if (type === "song") {
				document
					.querySelectorAll(".release_type_btn.selected")
					.forEach((item) => {
						item.classList.remove("selected");
					});
				button.classList.add("selected");
				controller.state.chart_object = "song";
			} else {
				document
					.getElementById("release_type_btn_song")
					?.classList.remove("selected");
				button.classList.toggle("selected");
				controller.state.chart_object = "release";
			}

			controller._updateFrameClass?.();
			controller._updateReleaseTypeValue?.();
		},
		selectReleaseTypeAll: () =>
			setSelectedReleaseTypes(
				[
					"album",
					"ep",
					"mixtape",
					"djmix",
					"single",
					"comp",
					"video",
					"unauth",
					"musicvideo",
					"additional",
				],
				controller.state,
			),
		selectReleaseTypeMain: () =>
			setSelectedReleaseTypes(
				["album", "ep", "mixtape", "djmix"],
				controller.state,
			),
		selectReleaseTypeAlbums: () =>
			setSelectedReleaseTypes(["album"], controller.state),
		selectReleaseTypeSingles: () =>
			setSelectedReleaseTypes(["single"], controller.state),
		selectReleaseTypeNone: () => setSelectedReleaseTypes([], controller.state),
		onMouseDownDateChooserDecade: (_event, year) => {
			if (
				controller.state.chart_date_range_type === "year_range" &&
				rangeStart !== null
			) {
				const range = combineYearRanges(rangeStart, decadeRange(year));
				selectDateRange(controller.state, range.start, range.end);
				rangeStart = null;
			} else {
				selectDateRange(controller.state, year, year + 9);
				rangeStart =
					controller.state.chart_date_range_type === "year_range"
						? decadeRange(year)
						: null;
			}
		},
		onMouseUpDateChooserDecade: () => undefined,
		onMouseOverDateChooserDecade: () => undefined,
		onMouseDownDateChooserYear: (_event, year) => {
			if (
				controller.state.chart_date_range_type === "year_range" &&
				rangeStart !== null
			) {
				const range = combineYearRanges(rangeStart, yearRange(year));
				selectDateRange(controller.state, range.start, range.end);
				rangeStart = null;
			} else {
				selectDateRange(controller.state, year, year);
				rangeStart =
					controller.state.chart_date_range_type === "year_range"
						? yearRange(year)
						: null;
			}
		},
		onMouseUpDateChooserYear: () => undefined,
		onMouseOverDateChooserYear: () => undefined,
	};

	(window as Window & { RYMchart?: RYMChartLike }).RYMchart = controller;
	return controller;
}

function parseInitialChartState(
	seeChartButton: HTMLAnchorElement,
): RYMChartState {
	const href = seeChartButton.getAttribute("href") ?? "";
	const match = /^\/charts\/([^/]+)\/([^/]+)\/([^/]+)\//.exec(href);

	const chartType = match?.[1] ?? "top";
	const objectType = match?.[2] ?? "album";
	const datePart = match?.[3] ?? "all-time";

	let startDate = 18000000;
	let endDate = 20999999;
	let dateRangeType = "all_time";

	if (/^\d{4}$/.test(datePart)) {
		const year = Number(datePart);
		startDate = year * 10000;
		endDate = year * 10000 + 9999;
		dateRangeType = "year_decade";
	} else if (/^\d{4}s$/.test(datePart)) {
		const year = Number(datePart.slice(0, 4));
		startDate = year * 10000;
		endDate = (year + 9) * 10000 + 9999;
		dateRangeType = "year_decade";
	}

	return {
		chart_type: chartType,
		chart_object: "release",
		chart_date_range_type: dateRangeType,
		release_types: [objectType],
		start_date: startDate,
		end_date: endDate,
	};
}

function initializeRYMChart(seeChartButton: HTMLAnchorElement): void {
	const rymChart = getRYMChart();
	if (!rymChart) {
		console.warn(
			"Even Better RYM: RYMchart is not available yet. Make sure the chart JS is loaded on genre pages.",
		);
		return;
	}

	const initialState = parseInitialChartState(seeChartButton);
	rymChart.state = {
		...rymChart.state,
		...initialState,
	};

	const releaseType = initialState.release_types?.[0] ?? "album";
	document.querySelectorAll(".release_type_btn").forEach((button) => {
		button.classList.remove("selected");
	});
	document
		.getElementById(`release_type_btn_${releaseType}`)
		?.classList.add("selected");

	const chartTypeTitle = document.getElementById(
		"page_chart_query_item_chart_type_title",
	);
	if (chartTypeTitle) {
		chartTypeTitle.textContent =
			(initialState.chart_type ?? "top").charAt(0).toUpperCase() +
			(initialState.chart_type ?? "top").slice(1);
	}

	rymChart._updateReleaseTypeValue?.();
	rymChart._updateFrameClass?.();
}

function getSelectedReleaseTypes(): string[] {
	return Array.from(
		document.querySelectorAll<HTMLElement>(
			".release_type_btn.selected[data-val]",
		),
	)
		.map((element) => element.dataset.val)
		.filter((value): value is string => Boolean(value));
}

function getDatePath(state: RYMChartState): string {
	const start = state.start_date ?? 18000000;
	const end = state.end_date ?? 20999999;

	if (start <= 18000000 && end >= 20999999) {
		return "all-time";
	}

	const startYear = Math.floor(start / 10000);
	const endYear = Math.floor(end / 10000);

	if (startYear === endYear) {
		return String(startYear);
	}

	if (startYear % 10 === 0 && endYear === startYear + 9) {
		return `${startYear}s`;
	}

	return `${startYear}-${endYear}`;
}

function updateSeeChartButton(seeChartButton: HTMLAnchorElement): void {
	const rymChart = getRYMChart();
	const state = rymChart?.state ?? parseInitialChartState(seeChartButton);
	const selectedReleaseTypes = getSelectedReleaseTypes();

	const originalHref =
		seeChartButton.dataset.ebrOriginalChartHref ??
		seeChartButton.getAttribute("href") ??
		"";
	seeChartButton.dataset.ebrOriginalChartHref = originalHref;

	const suffixMatch = /^\/charts\/[^/]+\/[^/]+\/[^/]+\/(.*)$/.exec(
		originalHref,
	);
	const suffix = suffixMatch?.[1] ?? "";
	const chartType = state.chart_type ?? "top";
	const datePath = getDatePath(state);

	const allReleaseTypes = [
		"album",
		"ep",
		"mixtape",
		"djmix",
		"single",
		"comp",
		"video",
		"unauth",
		"musicvideo",
		"additional",
	];

	let mediaType = "album";
	let buttonLabel = "Album";

	if (selectedReleaseTypes.length === 1 && selectedReleaseTypes[0] === "song") {
		mediaType = "song";
		buttonLabel = "Song";
	} else {
		const releaseTypes = selectedReleaseTypes.filter((type) => type !== "song");

		const allReleasesSelected =
			releaseTypes.length === allReleaseTypes.length &&
			allReleaseTypes.every((type) => releaseTypes.includes(type));

		if (allReleasesSelected) {
			mediaType = "release";
			buttonLabel = "Releases";
		} else if (releaseTypes.length === 1) {
			mediaType = releaseTypes[0];
			buttonLabel = RELEASE_TYPE_LABELS[releaseTypes[0]] ?? "Release";
		} else if (releaseTypes.length > 1) {
			mediaType = releaseTypes.join(",");

			const labels = releaseTypes.map(
				(type) => RELEASE_TYPE_LABELS[type] ?? type,
			);

			buttonLabel =
				labels.length === 2
					? `${labels[0]} and ${labels[1]}`
					: labels.join(", ");
		} else {
			mediaType = "album";
			buttonLabel = "Album";
		}
	}

	const releaseTypeTitle = document
		.getElementById("page_chart_query_item_chart_object_title")
		?.textContent?.trim();

	const compactLabel =
		releaseTypeTitle && releaseTypeTitle.length > 0
			? releaseTypeTitle
			: buttonLabel;

	seeChartButton.textContent = `See ${compactLabel} chart`;
	seeChartButton.href = `/charts/${chartType}/${mediaType}/${datePath}/${suffix}`;
}

function watchChartState(seeChartButton: HTMLAnchorElement): void {
	const query = document.getElementById("page_chart_query");
	if (!query) {
		return;
	}

	const sync = () => {
		requestAnimationFrame(() => updateSeeChartButton(seeChartButton));
	};

	query.addEventListener("click", sync);
	query.addEventListener("mousedown", sync);

	const observer = new MutationObserver(sync);
	observer.observe(query, {
		subtree: true,
		attributes: true,
		attributeFilter: ["class"],
		characterData: true,
	});
}

function wireGenreChartControls(seeChartButton: HTMLAnchorElement): void {
	const query = document.getElementById("page_chart_query");
	if (!query) {
		return;
	}

	query
		.querySelectorAll<HTMLElement>(
			"[onclick], [onmousedown], [onmouseup], [onmouseover]",
		)
		.forEach((element) => {
			element.removeAttribute("onclick");
			element.removeAttribute("onmousedown");
			element.removeAttribute("onmouseup");
			element.removeAttribute("onmouseover");
		});

	const topButton = document
		.getElementById("page_chart_query_item_chart_type_title")
		?.closest<HTMLElement>(".page_chart_query_item_type_selector");
	const objectButton = document
		.getElementById("page_chart_query_item_chart_object_title")
		?.closest<HTMLElement>(".page_chart_query_item_type_selector");
	const dateButton = document
		.getElementById("page_chart_query_item_chart_date_type_title")
		?.closest<HTMLElement>(".page_chart_query_item_type_selector");

	const topMenu = document.getElementById("page_chart_query_item_type_select");
	const objectMenu = document.getElementById(
		"page_chart_query_item_chart_object_select",
	);
	const dateMenu = document.getElementById("page_chart_query_item_date_select");

	const closeAllMenus = () => {
		[topMenu, objectMenu, dateMenu].forEach((menu) => {
			if (menu) menu.style.display = "none";
		});
		const overlay = document.getElementById("overlay_invisible");
		if (overlay) overlay.style.display = "none";
	};

	const toggleMenu = (menu: HTMLElement | null) => {
		if (!menu) return;
		const isOpen = getComputedStyle(menu).display !== "none";
		closeAllMenus();
		if (!isOpen) {
			menu.style.display = "block";
			const overlay = document.getElementById("overlay_invisible");
			if (overlay) overlay.style.display = "block";
		}
	};

	topButton?.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		toggleMenu(topMenu);
	});
	objectButton?.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		toggleMenu(objectMenu);
	});
	dateButton?.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		toggleMenu(dateMenu);
	});

	topMenu
		?.querySelectorAll<HTMLElement>(".page_chart_query_item_option[data-value]")
		.forEach((option) => {
			option.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				const chart = getRYMChart();
				if (!chart) return;
				chart.state.chart_type = option.dataset.value ?? "top";
				const title = document.getElementById(
					"page_chart_query_item_chart_type_title",
				);
				if (title) title.textContent = option.dataset.description ?? "Top";
				chart._updateFrameClass?.();
				closeAllMenus();
				updateSeeChartButton(seeChartButton);
			});
		});

	query
		.querySelectorAll<HTMLElement>(".release_type_btn[data-val]")
		.forEach((button) => {
			button.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				const type = button.dataset.val;
				if (!type) return;
				getRYMChart()?.toggleReleaseType?.(type);
				updateSeeChartButton(seeChartButton);
			});
		});

	const releaseActions: [string, keyof RYMChartLike][] = [
		["chart_release_all_none_btn_all", "selectReleaseTypeAll"],
		["chart_release_all_none_btn_main", "selectReleaseTypeMain"],
		["chart_release_all_none_btn_albums", "selectReleaseTypeAlbums"],
		["chart_release_all_none_btn_singles", "selectReleaseTypeSingles"],
		["chart_release_all_none_btn_clear", "selectReleaseTypeNone"],
	];
	for (const [id, method] of releaseActions) {
		document.getElementById(id)?.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			const chart = getRYMChart();
			const fn = chart?.[method];
			if (typeof fn === "function") {
				(fn as () => void)();
			}
			updateSeeChartButton(seeChartButton);
		});
	}

	objectMenu
		?.querySelector<HTMLElement>(
			".chart_section_release_type_chooser_frame_apply_btn .btn",
		)
		?.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			closeAllMenus();
		});

	dateMenu
		?.querySelectorAll<HTMLElement>(".page_chart_query_item_option[data-value]")
		.forEach((option) => {
			option.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				const chart = getRYMChart();
				if (!chart) return;
				const value = option.dataset.value ?? "all_time";
				chart.state.chart_date_range_type = value;
				if (value === "all_time") {
					chart.state.start_date = 18000000;
					chart.state.end_date = 20999999;
					const title = document.getElementById(
						"page_chart_query_item_chart_date_type_title",
					);
					if (title) title.textContent = "All-time";
				}
				chart._updateFrameClass?.();
				if (value === "all_time") closeAllMenus();
				updateSeeChartButton(seeChartButton);
			});
		});

	query
		.querySelectorAll<HTMLElement>(".date_year_chooser_year_btn")
		.forEach((button) => {
			const match = /date_year_chooser_year_(\d{4})$/.exec(button.id);
			if (!match) return;
			const year = Number(match[1]);
			button.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				getRYMChart()?.onMouseDownDateChooserYear?.(event, year);
				updateSeeChartButton(seeChartButton);
			});
		});

	query
		.querySelectorAll<HTMLElement>(".date_year_chooser_decade_btn")
		.forEach((button) => {
			const match = /date_year_chooser_decade_(\d{4})$/.exec(button.id);
			if (!match) return;
			const year = Number(match[1]);
			button.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				getRYMChart()?.onMouseDownDateChooserDecade?.(event, year);
				updateSeeChartButton(seeChartButton);
			});
		});

	dateMenu
		?.querySelector<HTMLElement>(".page_chart_query_date_close .btn")
		?.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			closeAllMenus();
		});

	document
		.getElementById("overlay_invisible")
		?.addEventListener("click", closeAllMenus);
}

export async function mainMusicGenre(): Promise<void> {
	console.log("Even Better RYM: Genre pages script loaded");
	await waitForDocumentReady();

	const seeChartButton = document.querySelector<HTMLAnchorElement>(
		'.page_section_charts_header a[href*="/charts/"]',
	);
	if (!seeChartButton) {
		console.warn("Even Better RYM: See chart button not found");
		return;
	}

	const header = seeChartButton.closest<HTMLElement>(
		".page_section_charts_header",
	);
	if (!header) {
		return;
	}

	if (document.querySelector(".ebr-genre-chart-controls-row")) {
		return;
	}

	ensureOverlay();

	const originalButtonParent = seeChartButton.parentElement;

	const controlsRow = document.createElement("div");
	controlsRow.className = "ebr-genre-chart-controls-row";

	/*
	 * Put the filter controls and See Chart button into one stable
	 * right-aligned group inside the existing chart header.
	 */
	if (originalButtonParent) {
		originalButtonParent.insertAdjacentElement("beforebegin", controlsRow);
	} else {
		header.appendChild(controlsRow);
	}

	controlsRow.insertAdjacentHTML("beforeend", CHART_CONTROLS_HTML);
	populateYearChooser();

	seeChartButton.classList.add("ebr-genre-chart-see-button");
	controlsRow.appendChild(seeChartButton);

	if (
		originalButtonParent &&
		originalButtonParent !== controlsRow &&
		originalButtonParent.children.length === 0
	) {
		originalButtonParent.remove();
	}

	// The source chart script declares RYMchart as a page-global classic-script
	// variable. If an extracted copy is bundled as a module, that variable is not
	// automatically exposed on window, so the inline onclick handlers cannot see
	// it. Install a small compatible controller when no usable global exists.
	ensureRYMChartController(parseInitialChartState(seeChartButton));
	initializeRYMChart(seeChartButton);
	wireGenreChartControls(seeChartButton);
	updateSeeChartButton(seeChartButton);
	watchChartState(seeChartButton);
}
