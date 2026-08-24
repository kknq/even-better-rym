import { getPageEnabled } from "~/shared/page-settings";
import { getReviewSettings } from "~/shared/visibility/settings";
import { getRatingsPageType } from "../hide-ratings/page-type";
import { insertGlobalReviewButton, main } from "./app";
import { injectHideReviewStyles, removeHideReviewStyles } from "./styles";

if (getRatingsPageType(globalThis.location.pathname)) {
	injectHideReviewStyles();

	if (await getPageEnabled("hideReviews")) {
		await main();
	} else {
		const settings = await getReviewSettings();
		if (settings.globalButton) insertGlobalReviewButton();
		else removeHideReviewStyles();
	}
}
