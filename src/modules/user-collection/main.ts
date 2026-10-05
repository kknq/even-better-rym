import { getCollectionSettings } from "~/shared/collection/settings";
import { getModuleEnabled } from "~/shared/page-settings";
import { pages } from "~/shared/pages";

import { savedCollectionUrl } from "./url";

const isUserCollection = location.pathname.startsWith(pages.userCollection);

const pageKey = isUserCollection ? "userCollection" : "filmCollection";

if (/^\/(?:film_)?collection\/[^/]+(?:\/|$)/.test(location.pathname)) {
	const [enabled, settings] = await Promise.all([
		getModuleEnabled(pageKey),
		getCollectionSettings(isUserCollection ? "music" : "film"),
	]);
	if (enabled) {
		const target = savedCollectionUrl(location.href, settings);
		if (target) location.replace(target);
		else {
			const { injectCollectionFilterButtons } = await import("./app");
			await injectCollectionFilterButtons();
		}
	}
}
