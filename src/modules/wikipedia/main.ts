import { runPage } from "~/shared/page-settings";
import { findReleaseIssue } from "~/shared/release-data";
import { getReleaseTitleData } from "~/shared/release-title";
import { waitForElement } from "~/shared/utils/dom";
import type { FetchRequest, FetchResponse } from "~/shared/utils/messaging";
import { sendBackgroundMessage } from "~/shared/utils/messaging";

import "./wikipedia.css";

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
	if (!submitLink?.parentElement || !release || !findReleaseIssue()) return;

	const container = document.createElement("div");
	container.className = "ebr-wikipedia-button-container";
	const link = document.createElement("button");
	link.className = "ebr-wikipedia-button";
	link.textContent = "Search Wikipedia";
	link.type = "button";
	link.addEventListener("click", () => {
		link.disabled = true;
		link.textContent = "Searching Wikipedia…";
		void searchWikipedia(release.artistName, release.albumTitle)
			.then((url) => {
				if (url) window.open(url, "_blank", "noopener,noreferrer");
				else link.textContent = "No Wikipedia article found";
			})
			.catch(() => {
				link.textContent = "Wikipedia search failed";
			})
			.finally(() => {
				link.disabled = false;
			});
	});
	container.append(link);
	submitLink.parentElement.after(container);
}

void runPage("wikipedia", main);
