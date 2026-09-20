import { getPageEnabled } from "~/shared/page-settings";
import { getRatingSettings } from "~/shared/visibility/settings";
import { main } from "./app";
import { insertGlobalRatingButton } from "./generic-page";
import { getRatingsPageType } from "./page-type";
import {
	injectHideStyles,
	injectUnboldStyles,
	removeHideStyles,
} from "./styles";

if (getRatingsPageType(globalThis.location.pathname)) {
	document.documentElement.classList.add("ebr-ratings-pending");
	injectHideStyles();
	injectUnboldStyles();

	try {
		if (await getPageEnabled("hideRatings")) {
			await main();
		} else {
			const settings = await getRatingSettings();
			if (settings.globalButton) insertGlobalRatingButton();
			else removeHideStyles();
		}
	} finally {
		document.documentElement.classList.remove("ebr-ratings-pending");
		document.documentElement.classList.add("ebr-ratings-ready");
	}
} else {
	document.documentElement.classList.add("ebr-ratings-ready");
}
