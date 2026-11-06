import * as cache from "~/shared/utils/cache";
import { getCurrentUsername, normalizeUsername } from "~/shared/utils/user";

export const FOLLOWERS_CACHE_TTL = 60_000;

const pending = new Map<string, Promise<string[]>>();

export const parseFollowers = (html: string, username: string): string[] => {
	const page = new DOMParser().parseFromString(html, "text/html");
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

export const getFollowers = async (username: string): Promise<string[]> => {
	const key = `user-page.followers.${normalizeUsername(username)}`;
	const inFlight = pending.get(key);
	if (inFlight) return inFlight;

	const request = (async () => {
		const cached = await cache.get<string[]>(key);
		if (cached !== undefined) return cached;

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15_000);
		try {
			const response = await fetch(
				`/friends/${encodeURIComponent(decodeURIComponent(username))}/`,
				{
					credentials: "same-origin",
					cache: "no-store",
					signal: controller.signal,
				},
			);
			if (!response.ok) {
				throw new Error(`Could not load followers (HTTP ${response.status})`);
			}
			const followers = parseFollowers(await response.text(), username);
			await cache.set(key, followers, FOLLOWERS_CACHE_TTL);
			return followers;
		} finally {
			clearTimeout(timeout);
		}
	})();
	pending.set(key, request);
	try {
		return await request;
	} finally {
		pending.delete(key);
	}
};
