import { wireButton } from "./button";
import { fireHide, fireShow } from "./events";

/**
 * Profile page (`/artist/*`, `/films/*`).
 *
 * Hides average ratings for releases the user has not rated, adds a
 * "Show / Hide Ratings" section in the artist info sidebar, and observes
 * lazy-loaded discography sections to re-apply the state.
 */
export const setupProfilePage = (): void => {
	setupProfileListeners();
	fireHide();
	insertProfileButton();
};

/**
 * Returns the `.disco_avg_rating` elements for releases the user has *not*
 * rated. Already-rated releases get the `.tm-visible` class so the
 * hide-styles skip them.
 */
const getProfileHideable = (): (Element | null)[] => {
	const releases = document.querySelectorAll(".disco_release, ul.films > li");
	const hideable: (Element | null)[] = [];

	for (const release of releases) {
		const rating = release.querySelector<HTMLElement>(".disco_cat_inner");
		const avg = release.querySelector(".disco_avg_rating");

		if (!rating || !Number.parseFloat(rating.innerText)) {
			hideable.push(avg);
		} else {
			avg?.classList.add("tm-visible");
		}
	}

	return hideable;
};

const setupProfileListeners = (): void => {
	const refresh = (visible: boolean) => {
		for (const el of getProfileHideable()) {
			if (visible) {
				el?.classList.add("tm-visible");
			} else {
				el?.classList.remove("tm-visible");
			}
		}
	};

	document.addEventListener("ebrHideRatings", () => {
		refresh(false);
	});
	document.addEventListener("ebrShowRatings", () => {
		refresh(true);
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
	if (!artistInfo) return;

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
	button.href = "#";
	wireButton(button);
	wrapper.appendChild(button);

	const content = document.createElement("div");
	content.classList.add("info_content");
	content.appendChild(wrapper);
	artistInfo.appendChild(content);
};
