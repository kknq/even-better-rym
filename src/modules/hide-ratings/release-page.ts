import { eyeIcon } from "~/shared/icons/eye";
import type { RatingSettings } from "~/shared/visibility/settings";
import { wireButton } from "./button";
import { fireHide } from "./events";

export const setupReleasePage = (
	settings: RatingSettings,
	showButton: boolean,
): void => {
	const ownRating = document.querySelector(
		"#catalog_list .my_rating, .catalog_line.my_rating",
	);

	if (ownRating) {
		document.body.classList.add("ebr-release-rated");
	}

	markRankingRow();
	applyRatingPolicy(settings, Boolean(ownRating));
	if (settings.tracks === "after-track-rated") observeTrackRatings();
	if (showButton) insertReleaseButton();
	if (showButton) insertSuggestionButton();
};

const applyRatingPolicy = (
	settings: RatingSettings,
	hasReleaseRating: boolean,
): void => {
	if (settings.ratings === "always" || !hasReleaseRating) fireHide();

	document.body.classList.toggle(
		"ebr-hide-all-ratings",
		settings.ratings === "always",
	);
	document.body.classList.toggle(
		"ebr-show-friends",
		settings.friends === "always" ||
			(settings.friends === "after-release-rated" && hasReleaseRating),
	);
	document.body.classList.toggle(
		"ebr-show-tracks",
		settings.tracks === "after-release-rated" && hasReleaseRating,
	);
	document.body.classList.toggle(
		"ebr-track-after-own-rating",
		settings.tracks === "after-track-rated",
	);
};

const observeTrackRatings = (): void => {
	const button = document.querySelector<HTMLElement>("#track_rating_btn");
	if (!button) return;

	const refresh = () => {
		document.body.classList.toggle(
			"ebr-tracks-rated",
			button.classList.contains("has_ratings"),
		);
	};

	refresh();
	new MutationObserver(refresh).observe(button, {
		attributes: true,
		attributeFilter: ["class"],
	});
};

const markRankingRow = (): void => {
	const rows = document.querySelectorAll<HTMLTableRowElement>(
		".album_info > tbody > tr, .film_info > tbody > tr",
	);

	for (const row of rows) {
		const header = row.querySelector<HTMLElement>("th.info_hdr");
		if (header?.innerText === "Ranked") {
			row.classList.add("tr-ranking");
			break;
		}
	}
};

const insertReleaseButton = (): void => {
	const buttonRow = document.querySelector<HTMLElement>(
		".release_my_catalog, .page_release_section_reviews, #content",
	);
	if (!buttonRow || document.getElementById("ebr-show-rating-btn")) return;

	const wrapper = document.createElement("div");
	wrapper.id = "ebr-show-rating-btn-release-wrapper";
	wrapper.classList.add("ebr-release-toggle-wrapper");
	wrapper.style.float = "left";

	const button = document.createElement("div");
	button.id = "ebr-show-rating-btn";
	button.tabIndex = 0;
	button.setAttribute("role", "button");
	button.classList.add("review_btn", "ebr-release-rating-toggle");
	wireButton(button);
	wrapper.appendChild(button);

	const reviewControls = buttonRow.querySelector(".my_catalog_review");
	const isFilm = document.documentElement.id === "page_film";
	const controlRow = isFilm ? (reviewControls ?? buttonRow) : buttonRow;
	const nativeControl = isFilm
		? controlRow.querySelector("#review_btn")
		: buttonRow.querySelector("#track_rating_btn");
	const clearEl = controlRow.querySelector(".clear");
	const reviewWrapper = document.getElementById(
		"ebr-show-review-btn-release-wrapper",
	);
	if (reviewWrapper) reviewWrapper.before(wrapper);
	else if (nativeControl) nativeControl.after(wrapper);
	else if (clearEl) clearEl.before(wrapper);
	else controlRow.appendChild(wrapper);
};

const insertSuggestionButton = (): void => {
	const section = document.querySelector<HTMLElement>(".section_suggestions");
	if (!section || document.getElementById("ebr-show-suggestion-ratings-btn"))
		return;

	const button = document.createElement("div");
	button.id = "ebr-show-suggestion-ratings-btn";
	button.tabIndex = 0;
	button.setAttribute("role", "button");
	button.classList.add("review_btn", "ebr-suggestion-rating-toggle");

	const update = (visible: boolean) => {
		button.dataset.visible = String(visible);
		const label = visible
			? "Hide Suggestions Ratings"
			: "Show Suggestions Ratings";
		button.innerHTML = `${eyeIcon(!visible)}<span>${label}</span>`;
		button.setAttribute("aria-label", label);
	};

	const toggle = () => {
		const visible = button.dataset.visible !== "true";
		document.body.classList.toggle("ebr-suggestions-ratings-visible", visible);
		update(visible);
	};

	update(false);
	button.addEventListener("click", toggle);
	button.addEventListener("keydown", (event) => {
		if (event.key !== "Enter" && event.key !== " ") return;

		event.preventDefault();
		toggle();
	});
	const suggestions = section.querySelector("ul.suggestions");
	if (suggestions) suggestions.after(button);
	else section.prepend(button);
};
