import { wireButton } from "./button";
import { fireHide } from "./events";

export const setupReleasePage = (): void => {
	const ownRating = document.querySelector(
		"#catalog_list .my_rating, .catalog_line.my_rating",
	);

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
	if (!buttonRow || document.getElementById("ebr-show-rating-btn")) return;

	const wrapper = document.createElement("div");
	wrapper.style.float = "left";

	const button = document.createElement("div");
	button.id = "ebr-show-rating-btn";
	button.tabIndex = 0;
	button.setAttribute("role", "button");
	button.classList.add("track_rating_btn", "ebr-rating-toggle");
	wireButton(button);
	wrapper.appendChild(button);

	const clearEl = buttonRow.querySelector(".clear");
	if (clearEl) clearEl.before(wrapper);
	else buttonRow.appendChild(wrapper);
};
