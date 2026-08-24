import { getPageEnabled } from "~/shared/page-settings";
import { waitForDocumentReady } from "~/shared/utils/dom";

import {
	injectHideCommentBoxStyles,
	removeHideCommentBoxStyles,
} from "./styles";

injectHideCommentBoxStyles();

if (await getPageEnabled("hideCommentBoxes")) {
	await waitForDocumentReady();
	document.body.classList.add("ebr-hide-comment-boxes");
} else {
	removeHideCommentBoxStyles();
}
