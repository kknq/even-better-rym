import { runModule } from "~/shared/page-settings";
import { getReferenceLinkSettings } from "~/shared/reference-links/settings";
import { getReleaseTitleData } from "~/shared/release-title";
import { waitForDocumentReady } from "~/shared/utils/dom";
import type {
	WikipediaSearchRequest,
	WikipediaSearchResponse,
} from "~/shared/utils/messaging";
import { sendBackgroundMessage } from "~/shared/utils/messaging";
import {
	appendAlbumIdControl,
	reduceTitleTopSpacing,
} from "./album-id-control";
import whoSampledLogo from "./assets/whosampled.svg";
import wikipediaLogo from "./assets/wikipedia.svg";
import { toSlug } from "./helpers";
import "./reference-links.css";

const getReferenceContainer = (titleElement: HTMLElement): HTMLDivElement => {
	const existing = document.querySelector<HTMLDivElement>(
		".ebr-reference-links",
	);
	if (existing) return existing;

	const container = document.createElement("div");
	container.className = "ebr-reference-links";
	titleElement.classList.add("ebr-reference-title");
	titleElement.insertBefore(
		container,
		titleElement.querySelector(":scope > .album_artist_small"),
	);
	return container;
};

const appendWhoSampledLink = (
	titleElement: HTMLElement,
	release: ReturnType<typeof getReleaseTitleData>,
	color: string,
): void => {
	if (!release) return;

	const container = getReferenceContainer(titleElement);
	if (container.querySelector(".ebr-whosampled-link")) return;

	const whoSampled = document.createElement("a");
	whoSampled.className =
		"btn blue_btn btn_small ebr-reference-link ebr-whosampled-link";
	whoSampled.style.setProperty("--ebr-reference-button-color", color);
	whoSampled.href = `https://www.whosampled.com/album/${toSlug(release.artistName)}/${toSlug(release.albumTitle)}/`;
	whoSampled.target = "_blank";
	whoSampled.rel = "noreferrer";
	const logo = document.createElement("img");
	logo.className = "ebr-whosampled-logo";
	logo.src = whoSampledLogo;
	logo.alt = "";
	const separator = document.createElement("span");
	separator.textContent = "|";
	separator.setAttribute("aria-hidden", "true");
	const label = document.createElement("span");
	label.textContent = "Search WhoSampled";
	whoSampled.append(logo, separator, label);

	container.append(whoSampled);
};

const appendWikipediaButton = (
	titleElement: HTMLElement,
	release: ReturnType<typeof getReleaseTitleData>,
	color: string,
): void => {
	if (!release) return;

	const container = getReferenceContainer(titleElement);
	if (container.querySelector(".ebr-wikipedia-link")) return;

	const wikipedia = document.createElement("button");
	wikipedia.type = "button";
	wikipedia.className =
		"btn blue_btn btn_small ebr-reference-link ebr-wikipedia-link";
	wikipedia.style.setProperty("--ebr-reference-button-color", color);
	const logo = document.createElement("img");
	logo.className = "ebr-wikipedia-logo";
	logo.src = wikipediaLogo;
	logo.alt = "";
	const separator = document.createElement("span");
	separator.textContent = "|";
	separator.setAttribute("aria-hidden", "true");
	const label = document.createElement("span");
	label.textContent = "Search Wikipedia";
	wikipedia.append(logo, separator, label);
	wikipedia.addEventListener("click", () => {
		const previous = label.textContent;
		wikipedia.disabled = true;
		label.textContent = "Searching Wikipedia…";
		void sendBackgroundMessage<WikipediaSearchRequest, WikipediaSearchResponse>(
			{
				type: "wikipediaSearch",
				data: {
					artistName: release.artistName,
					albumTitle: release.albumTitle,
				},
			},
		)
			.then((response) => {
				if (response.data.error) throw new Error(response.data.error);
				if (!response.data.url) {
					label.textContent = "No Wikipedia article found";
				}
			})
			.catch(() => {
				label.textContent = "Wikipedia search failed";
			})
			.finally(() => {
				wikipedia.disabled = false;
				setTimeout(() => {
					if (wikipedia.isConnected) label.textContent = previous;
				}, 1200);
			});
	});

	container.append(wikipedia);
};

async function main(): Promise<void> {
	await waitForDocumentReady();
	const titleElement = document.querySelector<HTMLElement>(".album_title");
	const release = getReleaseTitleData();
	if (!titleElement || !release) return;
	const settings = await getReferenceLinkSettings();

	await Promise.all([
		runModule("whoSampled", () => {
			appendWhoSampledLink(titleElement, release, settings.buttonColor);
		}),
		runModule("wikipedia", () => {
			appendWikipediaButton(titleElement, release, settings.buttonColor);
		}),
	]);

	if (document.querySelector(".ebr-whosampled-link, .ebr-wikipedia-link")) {
		appendAlbumIdControl(titleElement, settings.buttonColor);
		reduceTitleTopSpacing(titleElement);
	}
}

void main();
