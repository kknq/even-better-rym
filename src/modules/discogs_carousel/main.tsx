import { render } from "preact";
import { runPage } from "~/shared/page-settings";
import { findReleaseIssue } from "~/shared/release-data";
import { waitForElement } from "~/shared/utils/dom";
import type { FetchRequest, FetchResponse } from "~/shared/utils/messaging";
import { sendBackgroundMessage } from "~/shared/utils/messaging";

import { DiscogsCarousel } from "./app";

const DISCOGS_API = "https://api.discogs.com";

type SearchResult = {
	catno?: string;
	country?: string;
	format?: string[];
	id: number;
	label?: string[];
	resource_url?: string;
	title?: string;
	year?: number;
};

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
	if (response.data.status < 200 || response.data.status >= 300) {
		throw new Error(
			`Discogs request failed (${response.data.status} ${response.data.statusText}).`,
		);
	}
	return JSON.parse(response.data.body) as T;
};

const normalize = (value: string): string =>
	value.toLowerCase().replace(/[^a-z0-9]/g, "");

const scoreResult = (
	result: SearchResult,
	issue: ReturnType<typeof findReleaseIssue>,
): number => {
	if (!issue) return 0;
	let score = 0;
	if (
		result.catno &&
		normalize(result.catno) === normalize(issue.catalogNumber)
	)
		score += 100;
	if (
		result.label?.some((label) => normalize(label) === normalize(issue.label))
	)
		score += 20;
	if (issue.year && result.year === issue.year) score += 10;
	if (
		issue.country &&
		result.country &&
		normalize(result.country) === normalize(issue.country)
	)
		score += 10;
	if (
		issue.format &&
		result.format?.some((format) =>
			normalize(format).includes(normalize(issue.format)),
		)
	)
		score += 10;
	return score;
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
		.sort((a, b) => scoreResult(b, issue) - scoreResult(a, issue));
	if (candidates.length === 0) return [];

	const details = await fetchJson<ReleaseResponse>(candidates[0].resource_url);
	return (details.images ?? [])
		.filter((image) => image.type === "secondary" && image.uri)
		.map((image) => image.uri!);
}

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
	if (!submitLink?.parentElement) return;

	const coverArt = await waitForElement<HTMLElement>(
		".page_release_art_frame [class^='coverart_']",
	);
	const coverImage = coverArt.querySelector<HTMLImageElement>(
		"img[alt^='Cover art']",
	);
	const issue = findReleaseIssue();
	if (!issue) return;
	if (!coverImage) return;
	if (document.getElementById("even-better-rym-discogs-carousel")) return;

	const controlsTarget =
		document.querySelector<HTMLElement>("#even-better-rym") ??
		submitLink.parentElement;
	let cachedImages: string[] | undefined;
	let imageRequest: Promise<string[]> | undefined;
	const loadImages = () => {
		if (cachedImages) return Promise.resolve(cachedImages);
		imageRequest ??= getSecondaryImages(issue).then((images) => {
			cachedImages = images;
			return images;
		});
		return imageRequest;
	};
	const carouselContainer = document.createElement("div");
	carouselContainer.id = "even-better-rym-discogs-carousel";
	coverArt.append(carouselContainer);
	render(
		<DiscogsCarousel
			initialImage={coverImage.currentSrc || coverImage.src}
			loadImages={loadImages}
			controlsTarget={controlsTarget}
		/>,
		carouselContainer,
	);
}

void runPage("discogsCarousel", main);
