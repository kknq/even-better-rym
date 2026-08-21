import { wireButton } from "./button";
import { fireHide, fireShow } from "./events";

export const setupProfilePage = (): void => {
	setupProfileListeners();
	fireHide();
	insertProfileButton();
};

const refreshProfileRatings = (visible: boolean): void => {
	const releases = document.querySelectorAll(".disco_release");
	for (const release of releases) {
		const rating = release.querySelector<HTMLElement>(".disco_cat_inner");
		const ownRating = Number.parseFloat(rating?.textContent ?? "");
		const shouldShow = visible || Number.isFinite(ownRating);

		for (const value of release.querySelectorAll(
			".disco_avg_rating, .disco_ratings",
		)) {
			value.classList.toggle("ebr-rating-visible", shouldShow);
		}
	}
};

const setupProfileListeners = (): void => {
	document.addEventListener("ebrHideRatings", () => {
		refreshProfileRatings(false);
	});
	document.addEventListener("ebrShowRatings", () => {
		refreshProfileRatings(true);
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
		if (document.body.classList.contains("ratings-visible")) {
			fireShow();
		} else {
			fireHide();
		}
	}).observe(discography, { childList: true, subtree: true });
};

const insertProfileButton = (): void => {
	const artistInfo = document.querySelector<HTMLElement>(".artist_info_main");
	if (!artistInfo || document.getElementById("ebr-show-rating-btn-profile"))
		return;

	const clear = document.createElement("div");
	clear.style.clear = "both";
	artistInfo.appendChild(clear);

	const header = document.createElement("div");
	header.textContent = "Show / Hide Ratings";
	header.classList.add("info_hdr");
	header.style.marginTop = "1em";
	artistInfo.appendChild(header);

	const wrapper = document.createElement("div");
	wrapper.style.float = "left";
	const button = document.createElement("a");
	button.id = "ebr-show-rating-btn-profile";
	button.href = "#";
	button.classList.add("btn", "blue_btn", "ebr-rating-toggle");
	button.style.fontSize = "0.9em";
	wireButton(button);
	wrapper.appendChild(button);

	const content = document.createElement("div");
	content.classList.add("info_content");
	content.appendChild(wrapper);
	artistInfo.appendChild(content);
};
