import { runPage } from "~/shared/page-settings";
import { getReleaseTitleData } from "~/shared/release-title";
import { waitForDocumentReady } from "~/shared/utils/dom";
import type { FetchRequest, FetchResponse } from "~/shared/utils/messaging";
import { sendBackgroundMessage } from "~/shared/utils/messaging";
import whoSampledLogo from "./assets/whosampled.svg";
import wikipediaLogo from "./assets/wikipedia.svg";
import {
	findBestWikipediaResult,
	getWikipediaArticleUrl,
	toSlug,
} from "./helpers";
import "./reference-links.css";

type SearchResponse = {
	query?: {
		search?: { title: string; snippet?: string }[];
	};
};

const getReferenceContainer = (titleElement: HTMLElement): HTMLDivElement => {
	const existing = document.querySelector<HTMLDivElement>(
		".ebr-reference-links",
	);
	if (existing) return existing;

	const container = document.createElement("div");
	container.className = "ebr-reference-links";
	titleElement.insertBefore(
		container,
		titleElement.querySelector(":scope > .album_artist_small"),
	);
	return container;
};

const appendWhoSampledLink = (
	titleElement: HTMLElement,
	release: ReturnType<typeof getReleaseTitleData>,
): void => {
	if (!release) return;

	const container = getReferenceContainer(titleElement);
	if (container.querySelector(".ebr-whosampled-link")) return;

	const whoSampled = document.createElement("a");
	whoSampled.className =
		"btn blue_btn btn_small ebr-reference-link ebr-whosampled-link";
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

const searchWikipedia = async (
	artistName: string,
	albumTitle: string,
): Promise<string | undefined> => {
	const query = `"${albumTitle}" OR "${albumTitle} album" OR "${albumTitle}" "${artistName}"`;
	const response = await sendBackgroundMessage<FetchRequest, FetchResponse>({
		type: "fetch",
		data: {
			url: "https://en.wikipedia.org/w/api.php",
			urlParameters: {
				action: "query",
				format: "json",
				list: "search",
				origin: "*",
				srnamespace: "0",
				srlimit: "10",
				srsearch: query,
			},
			headers: { Accept: "application/json" },
		},
	});
	if (response.data.status < 200 || response.data.status >= 300) {
		throw new Error("Wikipedia search failed.");
	}

	const results = response.data.body
		? ((JSON.parse(response.data.body) as SearchResponse).query?.search ?? [])
		: [];
	const result = findBestWikipediaResult(results, albumTitle);

	return result ? getWikipediaArticleUrl(result.title) : undefined;
};

const appendWikipediaButton = (
	titleElement: HTMLElement,
	release: ReturnType<typeof getReleaseTitleData>,
): void => {
	if (!release) return;

	const container = getReferenceContainer(titleElement);
	if (container.querySelector(".ebr-wikipedia-link")) return;

	const wikipedia = document.createElement("button");
	wikipedia.type = "button";
	wikipedia.className =
		"btn blue_btn btn_small ebr-reference-link ebr-wikipedia-link";
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
		const articleWindow = window.open("about:blank", "_blank");
		if (articleWindow) articleWindow.opener = null;

		const previous = label.textContent;
		wikipedia.disabled = true;
		label.textContent = "Searching Wikipedia…";
		void searchWikipedia(release.artistName, release.albumTitle)
			.then((url) => {
				if (!url) {
					articleWindow?.close();
					label.textContent = "No Wikipedia article found";
					return;
				}

				if (articleWindow && !articleWindow.closed) {
					articleWindow.location.replace(url);
					return;
				}

				const fallbackLink = document.createElement("a");
				fallbackLink.className = wikipedia.className;
				fallbackLink.href = url;
				fallbackLink.target = "_blank";
				fallbackLink.rel = "noreferrer";
				fallbackLink.append(...wikipedia.childNodes);
				label.textContent = "Open Wikipedia article";
				wikipedia.replaceWith(fallbackLink);
			})
			.catch(() => {
				articleWindow?.close();
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

	void runPage("whoSampled", () => {
		appendWhoSampledLink(titleElement, release);
	});
	void runPage("wikipedia", () => {
		appendWikipediaButton(titleElement, release);
	});
}

void main();
