import { waitForDocumentReady } from "~/shared/utils/dom";
import { setupBodyListeners } from "./events";
import { setupGenericPage } from "./generic-page";
import { setupProfilePage } from "./profile-page";
import { setupReleasePage } from "./release-page";
import { injectHideStyles, injectUnboldStyles } from "./styles";

type PageType = "release" | "profile" | "generic";

const getPageType = (): PageType => {
	const segment = globalThis.location.pathname.split("/")[1];
	switch (segment) {
		case "artist":
		case "films":
			return "profile";
		case "release":
		case "film":
			return "release";
		default:
			return "generic";
	}
};

const PAGE_SETUP: Record<PageType, () => void> = {
	release: setupReleasePage,
	profile: setupProfilePage,
	generic: setupGenericPage,
};

export const main = async (): Promise<void> => {
	const pageType = getPageType();

	// Inject CSS immediately (document_start) — before any paint
	injectHideStyles();
	injectUnboldStyles();

	// DOM manipulation waits until the document is ready
	await waitForDocumentReady();

	setupBodyListeners();
	PAGE_SETUP[pageType]();
};
