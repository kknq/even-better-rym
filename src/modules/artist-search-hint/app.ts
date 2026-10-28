import { waitForDocumentReady } from "~/shared/utils/dom";
import { getArtistId, loadSearchHint } from "./data";

export const main = async (): Promise<void> => {
	await waitForDocumentReady();
	const title = document.querySelector(".artist_page .artist_name_hdr");
	const artistId = getArtistId(document);
	if (
		!title ||
		!artistId ||
		document.querySelector(".ebr-artist-search-hint")
	) {
		return;
	}

	const container = document.createElement("div");
	container.className = "ebr-artist-search-hint";
	const status = document.createElement("span");
	status.setAttribute("role", "status");
	const retry = document.createElement("button");
	retry.type = "button";
	retry.className = "btn flat_btn btn_small";
	retry.textContent = "Retry";
	retry.hidden = true;
	container.append(status, retry);
	title.after(container);

	const update = async (): Promise<void> => {
		retry.hidden = true;
		status.setAttribute("aria-busy", "true");
		status.textContent = "Loading...";
		try {
			const hint = await loadSearchHint(artistId);
			status.textContent = hint ?? "No search hint available.";
		} catch (error) {
			console.error("EvenBetterRYM: could not load artist search hint", error);
			status.textContent = "Could not load search hint.";
			retry.hidden = false;
		} finally {
			status.setAttribute("aria-busy", "false");
		}
	};

	retry.addEventListener("click", () => {
		void update();
	});
	await update();
};
