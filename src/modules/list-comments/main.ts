import { getModuleEnabled } from "~/shared/page-settings";
import { main } from "./app";

try {
	if (await getModuleEnabled("listComments")) {
		await main();
	}
} finally {
	document.documentElement.classList.add("ebr-list-comments-ready");
}
