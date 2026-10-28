import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { readSpotifySearchPage } from "./read-results";

const artist = "Молодёжьвыбираеткосмос";
const title = "компиляция, Ч. 2";
const albumUrl = "https://open.spotify.com/album/3SRxE9NuyRHYLcmCTaCEL3";

const resultLink = (
	linkTitle: string,
	href: string,
	cardText = `${linkTitle}2021 • ${artist}`,
) => {
	const link = {
		textContent: linkTitle,
		href,
		querySelectorAll: () => [] as HTMLAnchorElement[],
		parentElement: null as Element | null,
	};
	const card = {
		textContent: cardText,
		querySelectorAll: () => [link as unknown as HTMLAnchorElement],
		parentElement: null,
	} as unknown as Element;
	link.parentElement = card;
	return link as unknown as HTMLAnchorElement;
};

const setSearchPage = (
	links: HTMLAnchorElement[],
	textContent = links.map((link) => link.textContent).join(" "),
) => {
	vi.stubGlobal("document", {
		querySelector: (selector: string) =>
			selector === "main"
				? { textContent, querySelectorAll: () => links }
				: null,
	});
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("location", {
		hostname: "open.spotify.com",
		pathname: "/search/artist-title/albums",
	});
	vi.stubGlobal(
		"MutationObserver",
		class {
			observe = vi.fn();
			disconnect = vi.fn();
		},
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("readSpotifySearchPage", () => {
	test("returns an exact album link with the requested artist", async () => {
		setSearchPage([resultLink(title, albumUrl)]);

		await expect(readSpotifySearchPage(artist, title)).resolves.toBe(albumUrl);
	});

	test("treats Spotify's explicit no-results page as a normal no-match", async () => {
		setSearchPage([], "No results found");

		await expect(readSpotifySearchPage(artist, title)).resolves.toBeUndefined();
	});

	test("treats a completed search with no matching results as a normal no-match", async () => {
		setSearchPage([]);

		const result = readSpotifySearchPage(artist, title);
		await vi.advanceTimersByTimeAsync(12_000);

		await expect(result).resolves.toBeUndefined();
	});

	test("does not match the album when its artist does not match", async () => {
		setSearchPage([
			resultLink(title, albumUrl, `${title}2021 • Another Artist`),
		]);

		const result = readSpotifySearchPage(artist, title);
		await vi.advanceTimersByTimeAsync(12_000);

		await expect(result).resolves.toBeUndefined();
	});

	test("rejects a search that was redirected away from Spotify search", async () => {
		vi.stubGlobal("location", {
			hostname: "open.spotify.com",
			pathname: "/album/3SRxE9NuyRHYLcmCTaCEL3",
		});
		setSearchPage([]);

		await expect(readSpotifySearchPage(artist, title)).rejects.toThrow(
			"Spotify search page was redirected",
		);
	});

	test("rejects a Spotify error page instead of reporting no match", async () => {
		vi.stubGlobal("document", {
			querySelector: () => null,
			body: { textContent: "Something went wrong. Reload page" },
		});

		await expect(readSpotifySearchPage(artist, title)).rejects.toThrow(
			"Spotify search page failed to render",
		);
	});

	test("rejects when Spotify search results never load", async () => {
		vi.stubGlobal("document", { querySelector: () => null, body: null });

		const result = readSpotifySearchPage(artist, title);
		const rejection = expect(result).rejects.toThrow(
			"Spotify search results did not load",
		);
		await vi.advanceTimersByTimeAsync(12_000);

		await rejection;
	});
});
