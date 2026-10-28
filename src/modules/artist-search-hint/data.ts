import * as cache from "~/shared/utils/cache";
import { fetchInPage } from "~/shared/utils/fetch";

export const getArtistId = (root: Document): string | undefined => {
	const shortcut = root.querySelector<HTMLInputElement>(
		".artist_page input.rym_shortcut",
	);
	return /^\[Artist([1-9]\d*)\]$/.exec(shortcut?.value ?? "")?.[1];
};

export const getSearchUrl = (artistId: string): string => {
	const url = new URL("https://rateyourmusic.com/search");
	url.searchParams.set("searchterm", `[Artist${artistId}]`);
	url.searchParams.set("searchtype", "a");
	return url.toString();
};

export const parseSearchHint = (
	html: string,
	artistId: string,
): string | null => {
	const root = new DOMParser().parseFromString(html, "text/html");
	const artist = [
		...root.querySelectorAll(".page_search_results a.searchpage.artist"),
	].find((link) => link.getAttribute("title") === `[Artist${artistId}]`);
	const result = artist?.closest("tr.infobox");
	if (!result) {
		throw new Error(`Search results did not contain [Artist${artistId}]`);
	}

	const hint = result.querySelector(".subinfo .fa-question-circle")
		?.parentElement?.textContent;
	const text = hint?.replace(/\s+/g, " ").trim() ?? "";
	return text.length > 0 ? text : null;
};

export const loadSearchHint = async (
	artistId: string,
): Promise<string | null> => {
	const key = `artist-search-hint.${artistId}`;
	const cached = await cache.get<string | null>(key);
	if (cached !== undefined) return cached;

	const body = await fetchInPage({
		url: getSearchUrl(artistId),
		credentials: "include",
	});

	const hint = parseSearchHint(body, artistId);
	await cache.set(key, hint, 86_400_000);
	return hint;
};
