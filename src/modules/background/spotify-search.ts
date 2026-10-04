import browser from "webextension-polyfill";

import type {
	SpotifySearchRequest,
	SpotifySearchResponse,
} from "~/shared/utils/messaging";

const LOAD_TIMEOUT = 15_000;
type SearchCategory = "albums" | "tracks";

const waitForTab = (
	tabId: number,
	category: SearchCategory,
	reload = false,
): Promise<void> =>
	new Promise((resolve, reject) => {
		const onSearchPage = (url?: string) =>
			url?.startsWith("https://open.spotify.com/search/") &&
			new URL(url).pathname.endsWith(`/${category}`);
		const finish = (error?: Error) => {
			clearTimeout(timeout);
			browser.tabs.onUpdated.removeListener(onUpdated);
			if (error) reject(error);
			else resolve();
		};
		const onUpdated = (
			id: number,
			change: { status?: string },
			tab: { url?: string },
		) => {
			if (id === tabId && change.status === "complete" && onSearchPage(tab.url))
				finish();
		};
		const timeout = setTimeout(
			() => finish(new Error("Spotify search page did not load")),
			LOAD_TIMEOUT,
		);
		browser.tabs.onUpdated.addListener(onUpdated);
		if (reload)
			void browser.tabs
				.reload(tabId)
				.catch((error: unknown) =>
					finish(error instanceof Error ? error : new Error(String(error))),
				);
		else
			void browser.tabs.get(tabId).then(
				(tab) => {
					if (tab.status === "complete" && onSearchPage(tab.url)) finish();
				},
				(error: unknown) =>
					finish(error instanceof Error ? error : new Error(String(error))),
			);
	});

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

export const spotifySearch = async ({
	id,
	data: { artist, title, releaseType },
}: SpotifySearchRequest): Promise<SpotifySearchResponse> => {
	let windowId: number | undefined;
	let data: SpotifySearchResponse["data"];
	try {
		const category: SearchCategory =
			releaseType === "music video" ? "tracks" : "albums";
		const searchUrl = (category: SearchCategory) =>
			`https://open.spotify.com/search/${encodeURIComponent(`${artist} ${title}`)}/${category}`;
		const url = searchUrl(category);
		const searchWindow = await browser.windows.create({
			url,
			type: "popup",
			state: "minimized",
			focused: false,
		});
		windowId = searchWindow.id;
		if (windowId === undefined)
			throw new Error("Spotify search window has no ID");
		const activeTabId =
			searchWindow.tabs?.[0]?.id ??
			(await browser.tabs.query({ windowId }))[0]?.id;
		if (activeTabId === undefined)
			throw new Error("Spotify search window has no tab");
		const searchInTab = async (category: SearchCategory) => {
			for (let attempt = 0; attempt < 2; attempt++) {
				await waitForTab(activeTabId, category, attempt > 0);
				try {
					const results = await browser.scripting.executeScript({
						target: { tabId: activeTabId },
						func: readSpotifySearchPage,
						args: [artist, title, category, releaseType ?? null],
					});
					if (results.length === 0)
						throw new Error("Spotify search script did not return a result");
					const result: unknown = results[0]?.result;
					if (result !== undefined && typeof result !== "string")
						throw new Error("Spotify search returned an invalid link");
					return result;
				} catch (error) {
					if (
						attempt !== 0 ||
						!(error instanceof Error) ||
						!error.message.includes("Spotify search page failed to render")
					)
						throw error;
				}
			}
			throw new Error("Spotify search page failed to render");
		};
		let result = await searchInTab(category);
		if (!result && releaseType === "single") {
			await browser.tabs.update(activeTabId, { url: searchUrl("tracks") });
			result = await searchInTab("tracks");
		}
		data = { url: result };
	} catch (error) {
		data = {
			error: error instanceof Error ? error.message : String(error),
		};
	}
	if (windowId !== undefined) {
		try {
			await browser.windows.remove(windowId);
		} catch (error) {
			data = {
				error: `Could not close Spotify search window: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}
	return { id, type: "spotifySearch", data };
};
