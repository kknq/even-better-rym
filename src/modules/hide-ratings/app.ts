import { waitForDocumentReady } from "~/shared/utils/dom";
import { isOwnUserPage } from "~/shared/utils/user";
import { setupBodyListeners } from "./events";
import { setupGenericPage } from "./generic-page";
import { getRatingsPageType, type RatingsPageType } from "./page-type";
import { setupProfilePage } from "./profile-page";
import { setupReleasePage } from "./release-page";
import { injectHideStyles, injectUnboldStyles } from "./styles";

const PAGE_SETUP: Record<RatingsPageType, () => void> = {
	release: setupReleasePage,
	artist: setupProfilePage,
	browse: setupGenericPage,
};

export const main = async (): Promise<void> => {
	const pageType = getRatingsPageType(globalThis.location.pathname);
	if (!pageType) return;

	injectHideStyles();
	injectUnboldStyles();

	await waitForDocumentReady();

	if (pageType === "browse" && isOwnUserPage()) {
		document.body.classList.add("ratings-visible");
		return;
	}

	setupBodyListeners();
	PAGE_SETUP[pageType]();
};
