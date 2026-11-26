import { render } from "preact";
import { runModule } from "~/shared/page-settings";
import {
	findReleaseIssue,
	isSupportedReleasePagePath,
} from "~/shared/release-data";
import { createDiscogsSearch } from "~/shared/services/discogs/search";
import { waitForOptionalElement } from "~/shared/utils/dom";

import { DiscogsCarousel } from "./app";
import { createSecondaryImageLoader } from "./image-loader";
import { preloadImages } from "./preload-images";

const discogsSearch = createDiscogsSearch();

async function getSecondaryImages(
	issue: NonNullable<ReturnType<typeof findReleaseIssue>>,
	hasCover: boolean,
) {
	const details = await discogsSearch.findRelease(issue);
	return (details?.images ?? [])
		.filter((image) => (!hasCover || image.type === "secondary") && image.uri)
		.map((image) => image.uri!);
}

async function main(): Promise<void> {
	if (!isSupportedReleasePagePath(location.pathname)) return;
	const releaseFrame = await waitForOptionalElement<HTMLElement>(
		".page_release_art_frame",
	);
	if (!releaseFrame) return;
	const coverImage = releaseFrame.querySelector<HTMLImageElement>(
		'.hide-for-small [class^="coverart_"] img[alt^="Cover art"]',
	);
	let coverArt = coverImage?.closest<HTMLElement>("[class^='coverart_']");
	if (!coverArt) {
		const target =
			releaseFrame.querySelector(".hide-for-small") ?? releaseFrame;
		coverArt = document.createElement("div");
		coverArt.className = "ebr-discogs-cover-placeholder";
		target.prepend(coverArt);
	}
	if (document.getElementById("even-better-rym-discogs-carousel")) return;

	const loadImages = createSecondaryImageLoader(async () => {
		const issue = findReleaseIssue();
		const imageUrls = issue
			? await getSecondaryImages(issue, Boolean(coverImage))
			: [];
		return preloadImages(imageUrls);
	});
	const carouselContainer = document.createElement("div");
	carouselContainer.id = "even-better-rym-discogs-carousel";
	coverArt.append(carouselContainer);
	const coverLink = coverArt.closest("a");
	coverLink?.addEventListener("click", (event) => {
		if (
			event.target instanceof Node &&
			carouselContainer.contains(event.target)
		) {
			event.preventDefault();
			event.stopPropagation();
		}
	});
	coverLink?.addEventListener("keydown", (event) => {
		if (
			event.target instanceof Node &&
			carouselContainer.contains(event.target)
		) {
			event.stopPropagation();
		}
	});
	render(
		<DiscogsCarousel
			initialImage={
				coverImage?.currentSrc.length ? coverImage.currentSrc : coverImage?.src
			}
			loadImages={loadImages}
			controlsTarget={releaseFrame}
		/>,
		carouselContainer,
	);
}

void runModule("discogsCarousel", main);
