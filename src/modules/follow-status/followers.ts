import * as cache from "~/shared/utils/cache";
import { fetchInPage } from "~/shared/utils/fetch";
import { getCurrentUsername, normalizeUsername } from "~/shared/utils/user";

export const FOLLOWERS_CACHE_TTL = 60_000;

const pending = new Map<string, Promise<string[]>>();

export const parseFollowers = (
	html: string | Document,
	username: string,
): string[] => {
	const page =
		typeof html === "string"
			? new DOMParser().parseFromString(html, "text/html")
			: html;
	const signedInUsername = getCurrentUsername(page);
	if (
		!signedInUsername ||
		normalizeUsername(signedInUsername) !== normalizeUsername(username)
	) {
		throw new Error(
			"The followers page is not signed in to the expected account",
		);
	}

	const heading = [...page.querySelectorAll(".bubble_header")].find(
		(element) => element.textContent?.trim() === "Followers",
	);
	const content = heading?.nextElementSibling;
	const countText = content?.querySelector("p")?.textContent?.trim();
	const countMatch = countText?.match(
		/^Users who are following you \(([\d,]+)\):$/,
	);
	if (!content?.classList.contains("bubble_content") || !countMatch) {
		throw new Error("Could not find the followers list");
	}

	const followers = new Set<string>();
	for (const link of content.querySelectorAll<HTMLAnchorElement>("a.user")) {
		const url = new URL(link.getAttribute("href") ?? "", location.origin);
		const match = /^\/~([^/]+)\/?$/.exec(url.pathname);
		if (url.origin !== location.origin || !match?.[1]) {
			throw new Error("Invalid profile link in the followers list");
		}
		followers.add(normalizeUsername(match[1]));
	}

	if (followers.size !== Number(countMatch[1]?.replaceAll(",", ""))) {
		throw new Error("The followers list is incomplete");
	}
	return [...followers];
};

export const cacheFollowers = (
	username: string,
	followers: string[],
): Promise<void> =>
	cache.set(
		`user-page.followers.${normalizeUsername(username)}`,
		followers,
		FOLLOWERS_CACHE_TTL,
	);

export const getFollowers = async (username: string): Promise<string[]> => {
	const key = `user-page.followers.${normalizeUsername(username)}`;
	const inFlight = pending.get(key);
	if (inFlight) return inFlight;

	const request = (async () => {
		const cached = await cache.get<string[]>(key);
		if (cached !== undefined) return cached;

		const html = await fetchInPage(
			{
				url: new URL(
					`/friends/${encodeURIComponent(decodeURIComponent(username))}/`,
					"https://rateyourmusic.com",
				).href,
				credentials: "same-origin",
			},
			{ cache: "no-store", timeoutMs: 15_000 },
		);
		const followers = parseFollowers(html, username);
		await cacheFollowers(username, followers);
		return followers;
	})();
	pending.set(key, request);
	try {
		return await request;
	} finally {
		pending.delete(key);
	}
};
