import { getPageEnabled } from "~/shared/page-settings";
import { main } from "./app";
import { getRatingsPageType } from "./page-type";
import {
	injectHideStyles,
	injectUnboldStyles,
	removeHideStyles,
} from "./styles";

if (getRatingsPageType(globalThis.location.pathname)) {
	injectHideStyles();
	injectUnboldStyles();

	if (await getPageEnabled("hideRatings")) {
		await main();
	} else {
		removeHideStyles();
	}
}
