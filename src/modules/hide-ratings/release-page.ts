import { wireButton } from "./button";
import { fireHide } from "./events";

/**
 * Release page (`/release/*`, `/film/*`).
 *
 * If the user has already rated the release, ratings stay visible.
 * Otherwise:
 *  1. Marks the "Ranked" info row so the hide-styles can target it.
 *  2. Fires the initial hide event.
 *  3. Inserts a "Show Ratings" button into the existing button row.
 */
export const setupReleasePage = (): void => {
	const ownRating = document.querySelector("#catalog_list .my_rating");

	if (ownRating) {
		document.body.classList.add("ratings-visible");
		return;
	}

	markRankingRow();
	fireHide();
	insertReleaseButton();
};

const markRankingRow = (): void => {
	const rows = document.querySelectorAll<HTMLTableRowElement>(
		".album_info > tbody > tr",
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
	const buttonRow = document.querySelector<HTMLElement>(".release_my_catalog");
	if (!buttonRow) return;

	const wrapper = document.createElement("div");
	wrapper.style.float = "left";

	const button = document.createElement("div");
	button.classList.add("more_btn");
	button.id = "ebr-show-rating-btn";
	wireButton(button);
	wrapper.appendChild(button);

	const clearEl = buttonRow.querySelector(".clear");
	clearEl?.before(wrapper);
};
