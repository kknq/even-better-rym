import {
	buildArtistToken,
	insertArtistShortcut,
	isTrackTitleFieldId,
} from "../utils/artist-shortcuts";
import { patchCreateShortcut } from "../utils/page-functions";

export default async function injectArtistLinkFormatting() {
	document.addEventListener("EbrArtistShortcutInsertedEvent", (event) => {
		const { type, assocId, text, targetId, previousValue } = event.detail;
		if (type !== "a") return;
		if (previousValue === undefined) return;
		if (!isTrackTitleFieldId(targetId)) return;

		const target = document.getElementById(targetId);
		if (!(target instanceof HTMLInputElement)) return;

		target.value = insertArtistShortcut(
			previousValue,
			buildArtistToken(assocId, text),
		);
	});

	patchCreateShortcut();
}
