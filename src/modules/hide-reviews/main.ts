import { getPageEnabled } from "~/shared/page-settings";
import { getReviewSettings } from "~/shared/visibility/settings";
import { getRatingsPageType } from "../hide-ratings/page-type";
import { insertGlobalReviewButton, isReviewPage, main } from "./app";
import { injectHideReviewStyles, removeHideReviewStyles } from "./styles";

const page = getRatingsPageType(globalThis.location.pathname);

if (page && isReviewPage(page)) {
	document.documentElement.classList.add("ebr-reviews-pending");
	injectHideReviewStyles();

	try {
		if (await getPageEnabled("hideReviews")) {
			await main();
		} else {
			const settings = await getReviewSettings();
			if (settings.globalButton) insertGlobalReviewButton();
			else removeHideReviewStyles();
		}
	} finally {
		document.documentElement.classList.remove("ebr-reviews-pending");
		document.documentElement.classList.add("ebr-reviews-ready");
	}
} else {
	document.documentElement.classList.add("ebr-reviews-ready");
}
