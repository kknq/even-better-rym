import type { SearchCategory } from "./messages";

export const readSpotifySearchPage = async (
	artist: string,
	title: string,
	category: SearchCategory = "albums",
	releaseType: "single" | "music video" | null = null,
): Promise<string | undefined> => {
	const RESULTS_TIMEOUT = 12_000;
	const normalize = (value: string) =>
		value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
	const artistName = normalize(artist);
	const searchedTitle = normalize(title);
	const entity = category === "albums" ? "album" : "track";
	const resultSelector = `a[href^="/${entity}/"], a[href^="https://open.spotify.com/${entity}/"]`;
	const editionSuffix =
		/^(?:(?:\s*(?:\(|\[)|\s+[-\u2013\u2014]\s+)\s*(?:(?:\d{4}\s+)?remaster(?:ed)?(?:\s+(?:version|\d{4}))?|deluxe(?:\s+(?:edition|version))?)(?:\)|\])?)+$/;
	const videoSuffix =
		/^(?:\s*(?:\(|\[|-\s+)\s*(?:official\s+)?(?:music\s+)?video(?:\)|\])?)$/;

	const find = () => {
		if (
			location.hostname !== "open.spotify.com" ||
			!location.pathname.startsWith("/search/")
		) {
			throw new Error("Spotify search page was redirected");
		}
		const main = document.querySelector("main");
		if (
			!main &&
			document.body?.textContent?.includes("Something went wrong") &&
			document.body.textContent.includes("Reload page")
		)
			throw new Error("Spotify search page failed to render");
		const links =
			main?.querySelectorAll<HTMLAnchorElement>(resultSelector) ?? [];
		let editionUrl: string | undefined;
		for (const link of links) {
			const spotifyTitle = normalize(link.textContent ?? "");
			const exact = spotifyTitle === searchedTitle;
			if (
				!exact &&
				(!spotifyTitle.startsWith(searchedTitle) ||
					!(
						editionSuffix.test(spotifyTitle.slice(searchedTitle.length)) ||
						(releaseType === "music video" &&
							videoSuffix.test(spotifyTitle.slice(searchedTitle.length)))
					))
			)
				continue;
			const match = /^\/(album|track)\/([a-zA-Z0-9]{22})(?:[/?#]|$)/.exec(
				new URL(link.href).pathname,
			);
			if (match?.[1] !== entity) continue;

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
				if (resultIds.size > 1) break;
				if (normalize(card.textContent ?? "").includes(artistName)) {
					const url = `https://open.spotify.com/${entity}/${match[2]}`;
					if (exact)
						return {
							exactUrl: url,
							editionUrl,
							hasResults: true,
							hasPage: true,
						};
					editionUrl ??= url;
					break;
				}
				card = card.parentElement;
			}
		}
		return {
			exactUrl: undefined,
			editionUrl,
			hasResults: links.length > 0,
			hasPage: main !== null,
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
		const check = () => {
			try {
				const result = find();
				if (result.exactUrl || result.noResults) finish(result.exactUrl);
				else if (result.hasResults && !settleTimeout)
					settleTimeout = setTimeout(() => {
						try {
							const settled = find();
							finish(settled.exactUrl ?? settled.editionUrl);
						} catch (error) {
							finish(
								undefined,
								error instanceof Error ? error : new Error(String(error)),
							);
						}
					}, 1_500);
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
				if (result.hasPage) finish(result.exactUrl ?? result.editionUrl);
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
