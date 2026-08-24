import type { RatingVisibility } from "~/shared/visibility/settings";
import { wireButton } from "./button";
import { fireHide, fireShow } from "./events";

export const setupProfilePage = (
	visibility: RatingVisibility,
	showButton: boolean,
): void => {
	setupProfileListeners(visibility);
	fireHide();
	if (showButton) insertProfileButton();
};

const refreshProfileRatings = (
	visible: boolean,
	visibility: RatingVisibility,
): void => {
	const releases = document.querySelectorAll(".disco_release");
	for (const release of releases) {
		const rating = release.querySelector<HTMLElement>(".disco_cat_inner");
		const ownRating = Number.parseFloat(rating?.textContent ?? "");
		const shouldShow =
			visible || (visibility === "unrated" && Number.isFinite(ownRating));

		for (const value of release.querySelectorAll(
			".disco_avg_rating, .disco_ratings",
		)) {
			value.classList.toggle("ebr-rating-visible", shouldShow);
		}
	}
};

const setupProfileListeners = (visibility: RatingVisibility): void => {
	document.addEventListener("ebrHideRatings", () => {
		refreshProfileRatings(false, visibility);
	});
	document.addEventListener("ebrShowRatings", () => {
		refreshProfileRatings(true, visibility);
	});

	observeDiscography();
};

/**
 * Re-fires the current visibility event whenever the discography section
 * mutates (e.g. lazy-loaded pages).
 */
const observeDiscography = (): void => {
	const selectors = [
		".section_artist_discography",
		".section_artist_credits",
		".section_artist_filmography",
	];

	let discography: Element | null = null;
	for (const sel of selectors) {
		discography = document.querySelector(sel);
		if (discography) break;
	}
	if (!discography) return;

	new MutationObserver(() => {
		if (!document.body.classList.contains("ebr-hide-ratings")) {
			fireShow();
		} else {
			fireHide();
		}
	}).observe(discography, { childList: true, subtree: true });
};

const insertProfileButton = (): void => {
	const navigation = document.querySelector<HTMLElement>(
		".section_artist_page_section_nav",
	);
	if (!navigation || document.getElementById("ebr-show-rating-btn-profile"))
		return;

	const button = document.createElement("a");
	button.id = "ebr-show-rating-btn-profile";
	button.href = "#";
	button.classList.add("btn", "blue_btn", "ebr-profile-rating-toggle");
	wireButton(button);
	const followButton = document.querySelector<HTMLElement>(
		'[id^="follow_btn_artist_"]',
	);
	if (followButton) {
		button.style.height = `${followButton.getBoundingClientRect().height}px`;
	}

	const control = document.createElement("div");
	control.classList.add("ebr-profile-rating-control");
	control.appendChild(button);
	navigation.before(control);
};
