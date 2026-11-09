import {
	getSearchArtists,
	isReissueTitle,
	normalizeSearchText,
} from "~/shared/services/search-matching";
import type { SearchCategory } from "./messages";

export const readSpotifySearchPage = async (
	artist: string,
	title: string,
	category: SearchCategory = "albums",
	releaseType: "single" | "music video" | null = null,
	artistAlias?: string,
): Promise<string | undefined> => {
	const RESULTS_TIMEOUT = 7_000;
	const artistNames = getSearchArtists(artist, artistAlias).map(
		normalizeSearchText,
	);
	const searchedTitle = normalizeSearchText(title);
	const entity = category === "albums" ? "album" : "track";
	const resultSelector = `a[href^="/${entity}/"], a[href^="https://open.spotify.com/${entity}/"]`;
	const editionSuffix =
		/^(?:(?:\s*(?:\(|\[)|\s+[-\u2013\u2014]\s+)\s*(?:(?:\d{4}\s+)?remaster(?:ed)?(?:\s+(?:version|\d{4}))?|deluxe(?:\s+(?:edition|version))?)(?:\)|\])?)+$/;
	const videoSuffix =
		/^(?:\s*(?:\(|\[|-\s+)\s*(?:official\s+)?(?:music\s+)?video(?:\)|\])?)$/;

	const matchesTitle = (spotifyTitle: string) => {
		if (spotifyTitle === searchedTitle) return true;
		if (!spotifyTitle.startsWith(searchedTitle)) return false;
		const suffix = spotifyTitle.slice(searchedTitle.length);
		return (
			editionSuffix.test(suffix) ||
			isReissueTitle(spotifyTitle, searchedTitle) ||
			(releaseType === "music video" && videoSuffix.test(suffix))
		);
	};

	const hasMatchingArtist = (link: HTMLAnchorElement) => {
		let card: Element | null = link;
		for (let level = 0; level < 6 && card; level++) {
			const resultIds = new Set(
				[...card.querySelectorAll<HTMLAnchorElement>(resultSelector)]
					.map(
						(anchor) =>
							/\/(?:album|track)\/([a-zA-Z0-9]{22})/.exec(anchor.href)?.[1],
					)
					.filter(Boolean),
			);
			if (resultIds.size > 1) return false;
			const text = normalizeSearchText(card.textContent ?? "");
			if (artistNames.some((name) => text.includes(name))) return true;
			card = card.parentElement;
		}
		return false;
	};

	const findMatchingLinks = (links: Iterable<HTMLAnchorElement>) => {
		let editionUrl: string | undefined;
		for (const link of links) {
			const spotifyTitle = normalizeSearchText(link.textContent ?? "");
			if (!matchesTitle(spotifyTitle)) continue;
			const match = /^\/(album|track)\/([a-zA-Z0-9]{22})(?:[/?#]|$)/.exec(
				new URL(link.href).pathname,
			);
			if (match?.[1] !== entity) continue;
			if (!hasMatchingArtist(link)) continue;
			const url = `https://open.spotify.com/${entity}/${match[2]}`;
			if (spotifyTitle === searchedTitle)
				return {
					exactUrl: url,
					editionUrl,
				};
			editionUrl ??= url;
		}
		return {
			exactUrl: undefined,
			editionUrl,
		};
	};

	const find = () => {
		if (
			location.hostname !== "open.spotify.com" ||
			!location.pathname.startsWith("/search/")
		) {
			throw new Error("Spotify search page was redirected");
		}
		const main = document.querySelector("main");
		const renderError =
			!main &&
			(document.body?.textContent?.includes("Something went wrong") ?? false) &&
			(document.body?.textContent?.includes("Reload page") ?? false);
		const links =
			main?.querySelectorAll<HTMLAnchorElement>(resultSelector) ?? [];
		return {
			...findMatchingLinks(links),
			hasPage: main !== null,
			renderError,
			noResults: main?.textContent?.includes("No results found") ?? false,
		};
	};

	return new Promise((resolve, reject) => {
		let settleTimeout: ReturnType<typeof setTimeout> | undefined;
		const finish = (url?: string, error?: Error) => {
			clearTimeout(timeout);
			clearTimeout(settleTimeout);
			observer.disconnect();
			if (error) reject(error);
			else resolve(url);
		};
		const settle = () => {
			settleTimeout = undefined;
			try {
				const result = find();
				if (result.exactUrl || result.editionUrl || result.noResults)
					finish(result.exactUrl ?? result.editionUrl);
			} catch (error) {
				finish(
					undefined,
					error instanceof Error ? error : new Error(String(error)),
				);
			}
		};
		const check = () => {
			try {
				const result = find();
				if (result.exactUrl || result.noResults) finish(result.exactUrl);
				else if (result.editionUrl && !settleTimeout)
					settleTimeout = setTimeout(settle, 1_500);
			} catch (error) {
				finish(
					undefined,
					error instanceof Error ? error : new Error(String(error)),
				);
			}
		};
		const observer = new MutationObserver(check);
		const timeout = setTimeout(() => {
			try {
				const result = find();
				if (result.renderError)
					finish(undefined, new Error("Spotify search page failed to render"));
				else if (result.hasPage) finish(result.exactUrl ?? result.editionUrl);
				else
					finish(undefined, new Error("Spotify search results did not load"));
			} catch (error) {
				finish(
					undefined,
					error instanceof Error ? error : new Error(String(error)),
				);
			}
		}, RESULTS_TIMEOUT);
		observer.observe(document, { childList: true, subtree: true });
		check();
	});
};
