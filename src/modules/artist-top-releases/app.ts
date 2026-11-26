import { waitForDocumentReady } from "~/shared/utils/dom";
import { getArtistControls } from "~/shared/visibility/artist-controls";

export async function main(): Promise<void> {
	await waitForDocumentReady();
	const match = /^\/artist\/([^/]+)\/?$/.exec(location.pathname);
	const header = document.querySelector(".artist_page .section_artist_name");
	if (
		!match ||
		!header?.querySelector(".artist_name_hdr") ||
		document.querySelector(".ebr-artist-top-releases")
	) {
		return;
	}

	const control = getArtistControls();
	if (!control) return;

	const link = document.createElement("a");
	link.className = "btn blue_btn ebr-artist-top-releases";
	link.href = `/charts/top/album,ep,mixtape,djmix/all-time/a:${match[1].replaceAll("-", "%2D")}/`;
	link.target = "_blank";
	link.rel = "noopener";
	link.setAttribute(
		"aria-label",
		"Open the Top Main Releases Chart (opens in a new tab)",
	);
	link.textContent = "Open the Top Main Releases Chart";
	const icon = document.createElement("span");
	icon.className = "ebr-artist-top-releases-icon";
	icon.setAttribute("aria-hidden", "true");
	link.append(icon);
	control.append(link);
}
