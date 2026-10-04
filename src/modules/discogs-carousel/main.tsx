import { render } from "preact";
import { runPage } from "~/shared/page-settings";
import {
	findReleaseIssue,
	isSupportedReleasePagePath,
} from "~/shared/release-data";
import { waitForOptionalElement } from "~/shared/utils/dom";
import type { FetchRequest, FetchResponse } from "~/shared/utils/messaging";
import { sendBackgroundMessage } from "~/shared/utils/messaging";

import { DiscogsCarousel } from "./app";
import { createSecondaryImageLoader } from "./image-loader";
import { findBestReleaseMatch, type SearchResult } from "./matching";
import { preloadImages } from "./preload-images";

const DISCOGS_API = "https://api.discogs.com";

type SearchResponse = {
	results?: SearchResult[];
};

type ReleaseImage = {
	type?: string;
	uri?: string;
};

type ReleaseResponse = {
	images?: ReleaseImage[];
	resource_url?: string;
};

const fetchJson = async <T,>(url: string): Promise<T> => {
	const response = await sendBackgroundMessage<FetchRequest, FetchResponse>({
		type: "fetch",
		data: {
			url,
			headers: {
				Accept: "application/json",
				"User-Agent":
					"EvenBetterRYM/2.6.1 (+https://github.com/kknq/even-better-rym)",
			},
		},
	});
	if (response.data.status === 429) {
		throw new Error("Discogs rate limit reached. Please try again later.");
	}
	if (response.data.error) throw new Error(response.data.error);
	if (response.data.status < 200 || response.data.status >= 300) {
		throw new Error(
			`Discogs request failed (${response.data.status} ${response.data.statusText}).`,
		);
	}
	return JSON.parse(response.data.body) as T;
};

async function getSecondaryImages(
	issue: NonNullable<ReturnType<typeof findReleaseIssue>>,
) {
	const query = new URLSearchParams({
		catno: issue.catalogNumber,
		type: "release",
		per_page: "10",
	});
	const search = await fetchJson<SearchResponse>(
		`${DISCOGS_API}/database/search?${query}`,
	);
	const candidates = (search.results ?? [])
		.filter(
			(result): result is SearchResult & { resource_url: string } =>
				typeof result.resource_url === "string",
		)
		.sort(
			(a, b) => findBestReleaseMatch(b, issue) - findBestReleaseMatch(a, issue),
		);
	const bestMatch = candidates[0];
	if (!bestMatch || findBestReleaseMatch(bestMatch, issue) < 0) return [];

	const details = await fetchJson<ReleaseResponse>(bestMatch.resource_url);
	return (details.images ?? [])
		.filter((image) => image.type === "secondary" && image.uri)
		.map((image) => image.uri!);
}

async function main(): Promise<void> {
	if (!isSupportedReleasePagePath(location.pathname)) return;
	const coverImage = await waitForOptionalElement<HTMLImageElement>(
		'.page_release_art_frame .hide-for-small [class^="coverart_"] img[alt^="Cover art"]',
	);
	if (!coverImage) return;
	const coverArt = coverImage.closest<HTMLElement>("[class^='coverart_']");
	if (!coverArt) return;
	const releaseFrame = coverArt.closest<HTMLElement>(".page_release_art_frame");
	if (!releaseFrame) return;
	if (document.getElementById("even-better-rym-discogs-carousel")) return;

	const loadImages = createSecondaryImageLoader(async () => {
		const issue = findReleaseIssue();
		const imageUrls = issue ? await getSecondaryImages(issue) : [];
		return preloadImages(imageUrls);
	});
	const carouselContainer = document.createElement("div");
	carouselContainer.id = "even-better-rym-discogs-carousel";
	coverArt.append(carouselContainer);
	render(
		<DiscogsCarousel
			initialImage={coverImage.currentSrc || coverImage.src}
			loadImages={loadImages}
			controlsTarget={releaseFrame}
		/>,
		carouselContainer,
	);
}

void runPage("discogsCarousel", main);
