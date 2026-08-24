import { waitForDocumentReady } from "~/shared/utils/dom";
import { isOwnProfile, isOwnUserPage } from "~/shared/utils/user";
import { prepareCollectionRows } from "~/shared/visibility/collection";
import { getRatingSettings } from "~/shared/visibility/settings";
import { setupBodyListeners } from "./events";
import { insertGlobalRatingButton, setupGenericPage } from "./generic-page";
import {
	getRatingsPageType,
	isReleaseReviewList,
	preservesListVisibility,
} from "./page-type";
import { setupProfilePage } from "./profile-page";
import { setupReleasePage } from "./release-page";
import { injectHideStyles, injectUnboldStyles } from "./styles";

export const main = async (): Promise<void> => {
	const pageType = getRatingsPageType(globalThis.location.pathname);
	if (!pageType) return;

	const settings = await getRatingSettings();
	if (!settings.pages[pageType]) return;

	injectHideStyles();
	injectUnboldStyles();

	await waitForDocumentReady();
	if (pageType === "profile" && isOwnProfile()) return;
	if (pageType === "collection" && isOwnUserPage()) return;

	document.body.classList.toggle(
		"ebr-hide-rating-counts",
		settings.counts === "scores-and-counts",
	);

	setupBodyListeners();
	const showPageButton = settings.buttons;
	if (pageType === "collection") prepareCollectionRows();
	if (
		(pageType === "release" || pageType === "film") &&
		!isReleaseReviewList(globalThis.location.pathname)
	) {
		setupReleasePage(settings, showPageButton);
	} else if (pageType === "artist") {
		setupProfilePage(settings.ratings, showPageButton);
	} else {
		setupGenericPage(
			showPageButton,
			preservesListVisibility(pageType, globalThis.location.pathname),
		);
	}
	if (pageType === "collection") setupCollectionStriping();
	if (settings.globalButton) insertGlobalRatingButton();
};

const setupCollectionStriping = (): void => {
	const restripe = () => {
		const rows = [
			...document.querySelectorAll<HTMLTableRowElement>(".mbgen tr"),
		];
		const hidingRatings = document.body.classList.contains("ebr-hide-ratings");
		const stripeableRows = rows.filter((row) => {
			const isRelease = /^page_catalog_item_\d+$/.test(row.id);
			const isTrackRatings =
				row.querySelector(".or_q_review_td .track_rating_header") !== null;
			const isReview =
				row.querySelector(".ebr-collection-review-content") !== null;
			return isRelease || isReview || (!hidingRatings && isTrackRatings);
		});

		for (const row of rows) {
			row.classList.remove(
				"ebr-collection-row-light",
				"ebr-collection-row-dark",
			);
		}

		for (const [index, row] of stripeableRows.entries()) {
			row.classList.toggle("ebr-collection-row-light", index % 2 === 0);
			row.classList.toggle("ebr-collection-row-dark", index % 2 !== 0);
		}
	};

	restripe();
	document.addEventListener("ebrHideRatings", restripe);
	document.addEventListener("ebrShowRatings", restripe);
};
