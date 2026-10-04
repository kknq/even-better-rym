import { getModuleEnabled } from "~/shared/page-settings";
import { waitForDocumentReady } from "~/shared/utils/dom";

import {
	injectHideCommentBoxStyles,
	removeHideCommentBoxStyles,
} from "./styles";

injectHideCommentBoxStyles();

if (await getModuleEnabled("hideCommentBoxes")) {
	await waitForDocumentReady();
	document.body.classList.add("ebr-hide-comment-boxes");
} else {
	removeHideCommentBoxStyles();
}
