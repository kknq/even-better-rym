import { runPage } from "~/shared/page-settings";
import { findReleaseIssue } from "~/shared/release-data";
import { getReleaseTitleData } from "~/shared/release-title";
import { waitForElement } from "~/shared/utils/dom";
import type { FetchRequest, FetchResponse } from "~/shared/utils/messaging";
import { sendBackgroundMessage } from "~/shared/utils/messaging";

import "./reference-links.css";

type SearchResult = {
	ns: number;
	title: string;
	snippet?: string;
};

type SearchResponse = {
	query?: {
		search?: SearchResult[];
	};
};

const normalize = (value: string): string =>
	value.toLowerCase().replace(/[^a-z0-9]/g, "");

const toSlug = (value: string): string =>
	value
		.trim()
		.replace(/\s+/g, "-")
		.replace(/-By-.*/i, "")
		.replace(/-+$/g, "");

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

	const album = normalize(albumTitle);
	const artist = normalize(artistName);
	const result = (
		response.data.body
			? ((JSON.parse(response.data.body) as SearchResponse).query?.search ?? [])
			: []
	).sort((a, b) => {
		const score = (item: SearchResult): number => {
			const title = normalize(item.title);
			const text = normalize(`${item.title} ${item.snippet ?? ""}`);
			const isAlbumArticle = /\(album\)\s*$/i.test(item.title);
			return (
				(title === album ? 100 : 0) +
				(title.includes(album) ? 30 : 0) +
				(title.includes("album") ? 20 : 0) +
				(isAlbumArticle ? 60 : 0) +
				(text.includes(artist) ? 10 : 0)
			);
		};
		return score(b) - score(a);
	})[0];
	return result
		? `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, "_"))}`
		: undefined;
};

const appendReferenceLinks = (
	submitLink: HTMLAnchorElement,
	release: ReturnType<typeof getReleaseTitleData>,
): void => {
	if (!release) return;

	const container = document.createElement("div");
	container.className = "ebr-reference-links";

	const whoSampled = document.createElement("a");
	whoSampled.className = "ebr-reference-link ebr-reference-link--primary";
	whoSampled.href = `https://www.whosampled.com/album/${toSlug(release.artistName)}/${toSlug(release.albumTitle)}/`;
	whoSampled.target = "_blank";
	whoSampled.rel = "noreferrer";
	whoSampled.textContent = "View on WhoSampled";

	const wikipedia = document.createElement("button");
	wikipedia.type = "button";
	wikipedia.className = "ebr-reference-link ebr-reference-link--secondary";
	wikipedia.textContent = "Search Wikipedia";
	wikipedia.addEventListener("click", () => {
		const previous = wikipedia.textContent;
		wikipedia.disabled = true;
		wikipedia.textContent = "Searching Wikipedia…";
		void searchWikipedia(release.artistName, release.albumTitle)
			.then((url) => {
				if (url) window.open(url, "_blank", "noopener,noreferrer");
				else wikipedia.textContent = "No Wikipedia article found";
			})
			.catch(() => {
				wikipedia.textContent = "Wikipedia search failed";
			})
			.finally(() => {
				wikipedia.disabled = false;
				setTimeout(() => {
					wikipedia.textContent = previous;
				}, 1200);
			});
	});

	container.append(whoSampled, wikipedia);
	submitLink.parentElement?.after(container);
};

async function main(): Promise<void> {
	await waitForElement<HTMLAnchorElement>('a[href*="/submit_media_link"]');
	const submitLinks = Array.from(
		document.querySelectorAll<HTMLAnchorElement>(
			'a[href*="/submit_media_link"]',
		),
	);
	const submitLink =
		submitLinks.find((link) => !link.closest(".show-for-small")) ??
		submitLinks.at(-1);
	const release = getReleaseTitleData();
	if (!submitLink || !release || !findReleaseIssue()) return;
	appendReferenceLinks(submitLink, release);
}

void runPage("referenceLinks", main);
