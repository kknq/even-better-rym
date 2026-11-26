import { render } from "preact";
import { findReleaseIssue } from "~/shared/release-data";
import type { ReleaseTitleData } from "~/shared/release-title";
import DiscogsIcon from "~/shared/services/discogs/icon";
import type {
	DiscogsSearchRequest,
	DiscogsSearchResponse,
} from "~/shared/utils/messaging";
import { sendBackgroundMessage } from "~/shared/utils/messaging";

export const createDiscogsButton = (
	release: ReleaseTitleData,
	color: string,
): HTMLButtonElement => {
	const button = document.createElement("button");
	button.type = "button";
	button.className =
		"btn blue_btn btn_small ebr-reference-link ebr-discogs-link";
	button.style.setProperty("--ebr-reference-button-color", color);
	const logo = document.createElement("span");
	logo.className = "ebr-discogs-logo";
	logo.setAttribute("aria-hidden", "true");
	render(<DiscogsIcon />, logo);
	const separator = document.createElement("span");
	separator.textContent = "|";
	separator.setAttribute("aria-hidden", "true");
	const label = document.createElement("span");
	label.textContent = "Search on Discogs";
	label.setAttribute("role", "status");
	button.append(logo, separator, label);
	button.addEventListener("click", () => {
		if (button.disabled) return;
		button.disabled = true;
		label.textContent = "Searching Discogs…";
		void sendBackgroundMessage<DiscogsSearchRequest, DiscogsSearchResponse>({
			type: "discogsSearch",
			data: { release, issue: findReleaseIssue() },
		})
			.then((response) => {
				if (response.data.error) throw new Error(response.data.error);
				label.textContent = response.data.url
					? "Search on Discogs"
					: "No Discogs release found";
			})
			.catch((error: unknown) => {
				label.textContent =
					error instanceof Error ? error.message : "Discogs search failed.";
			})
			.finally(() => {
				button.disabled = false;
			});
	});
	return button;
};
