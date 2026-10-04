import {
	waitForDocumentReady,
	waitForOptionalElement,
} from "~/shared/utils/dom";

import { getRatingEntries } from "./data";
import { getReception } from "./reception";
import { appendReception } from "./view";

export const main = async (): Promise<void> => {
	await waitForDocumentReady();
	const statsContainer = await waitForOptionalElement<HTMLElement>(
		".catalog_stats.hide-for-small",
	);
	if (!statsContainer || statsContainer.querySelector(".ebr-user-reception"))
		return;

	const reception = getReception(getRatingEntries(statsContainer));
	if (reception) appendReception(statsContainer, reception);
};
