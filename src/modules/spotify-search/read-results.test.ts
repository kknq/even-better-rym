import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { readSpotifySearchPage } from "./read-results";

const artist = "Молодёжьвыбираеткосмос";
const title = "компиляция, Ч. 2";
const albumUrl = "https://open.spotify.com/album/3SRxE9NuyRHYLcmCTaCEL3";
let notifyMutation: () => void;

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
			constructor(callback: () => void) {
				notifyMutation = callback;
			}
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

	test("matches literal percent signs in artist and title without URL-escaping them", async () => {
		const percentTitle = "How Is This Going to Make It Any Better";
		setSearchPage([
			resultLink(percentTitle, albumUrl, `${percentTitle}2025 • 72%`),
		]);
		await expect(readSpotifySearchPage("72%", percentTitle)).resolves.toBe(
			albumUrl,
		);
		setSearchPage([resultLink("100%", albumUrl, "100%2025 • Artist")]);
		await expect(readSpotifySearchPage("Artist", "100%")).resolves.toBe(
			albumUrl,
		);
	});

	test("reads matching results after Spotify rewrites an escaped percent to its bare-percent route", async () => {
		const percentTitle = "How Is This Going to Make It Any Better";
		vi.stubGlobal("location", {
			hostname: "open.spotify.com",
			pathname:
				"/search/72%%20How%20Is%20This%20Going%20to%20Make%20It%20Any%20Better/albums",
		});
		setSearchPage([
			resultLink(percentTitle, albumUrl, `${percentTitle}2025 • 72%`),
		]);
		await expect(readSpotifySearchPage("72%", percentTitle)).resolves.toBe(
			albumUrl,
		);
	});

	test("waits for Musora when unrelated results render first", async () => {
		setSearchPage([resultLink("Another album", albumUrl)]);
		const settled = vi.fn();
		const result = readSpotifySearchPage("Глад Валакас", "Мусора").then(
			(url) => {
				settled(url);
				return url;
			},
		);

		await vi.advanceTimersByTimeAsync(2_000);
		expect(settled).not.toHaveBeenCalled();

		const musoraUrl = "https://open.spotify.com/album/4weQ0de3lNVjrAidDUFWcn";
		setSearchPage([
			resultLink("Мусора", musoraUrl, "Мусора2023 • Глад Валакас"),
		]);
		notifyMutation();

		await expect(result).resolves.toBe(musoraUrl);
	});

	test("waits for artist metadata after the matching title renders", async () => {
		setSearchPage([resultLink(title, albumUrl, title)]);
		const settled = vi.fn();
		const result = readSpotifySearchPage(artist, title).then((url) => {
			settled(url);
			return url;
		});

		await vi.advanceTimersByTimeAsync(2_000);
		expect(settled).not.toHaveBeenCalled();

		setSearchPage([resultLink(title, albumUrl)]);
		notifyMutation();

		await expect(result).resolves.toBe(albumUrl);
	});

	test("waits until the deadline when results never match", async () => {
		setSearchPage([resultLink("Another album", albumUrl)]);
		const settled = vi.fn();
		const result = readSpotifySearchPage(artist, title).then((url) => {
			settled(url);
			return url;
		});

		await vi.advanceTimersByTimeAsync(6_999);
		expect(settled).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);

		await expect(result).resolves.toBeUndefined();
	});

	test("still accepts a matching edition after a short settling period", async () => {
		setSearchPage([resultLink(`${title} (Deluxe Edition)`, albumUrl)]);
		const result = readSpotifySearchPage(artist, title);

		await vi.advanceTimersByTimeAsync(1_500);

		await expect(result).resolves.toBe(albumUrl);
	});

	test("prefers an exact title arriving while a matching edition settles", async () => {
		const edition = resultLink(`${title} (Deluxe Edition)`, albumUrl);
		setSearchPage([edition]);
		const result = readSpotifySearchPage(artist, title);
		await vi.advanceTimersByTimeAsync(1_000);

		const exactUrl = "https://open.spotify.com/album/4weQ0de3lNVjrAidDUFWcn";
		setSearchPage([edition, resultLink(title, exactUrl)]);
		notifyMutation();

		await expect(result).resolves.toBe(exactUrl);
	});

	test("treats Spotify's explicit no-results page as a normal no-match", async () => {
		setSearchPage([], "No results found");

		await expect(readSpotifySearchPage(artist, title)).resolves.toBeUndefined();
	});

	test("treats a completed search with no matching results as a normal no-match", async () => {
		setSearchPage([]);

		const result = readSpotifySearchPage(artist, title);
		await vi.advanceTimersByTimeAsync(7_000);

		await expect(result).resolves.toBeUndefined();
	});

	test("does not match the album when its artist does not match", async () => {
		setSearchPage([
			resultLink(title, albumUrl, `${title}2021 • Another Artist`),
		]);

		const result = readSpotifySearchPage(artist, title);
		await vi.advanceTimersByTimeAsync(7_000);

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

	test("allows a Spotify startup error page to recover before the deadline", async () => {
		vi.stubGlobal("document", {
			querySelector: () => null,
			body: { textContent: "Something went wrong. Reload page" },
		});
		const settled = vi.fn();
		const result = readSpotifySearchPage(artist, title).then((url) => {
			settled(url);
			return url;
		});
		await vi.advanceTimersByTimeAsync(6_999);
		expect(settled).not.toHaveBeenCalled();
		setSearchPage([resultLink(title, albumUrl)]);
		notifyMutation();
		await expect(result).resolves.toBe(albumUrl);
		expect(vi.getTimerCount()).toBe(0);
	});

	test("rejects a persistent Spotify error page only at the deadline", async () => {
		vi.stubGlobal("document", {
			querySelector: () => null,
			body: { textContent: "Something went wrong. Reload page" },
		});

		const result = readSpotifySearchPage(artist, title);
		const rejection = expect(result).rejects.toThrow(
			"Spotify search page failed to render",
		);
		await vi.advanceTimersByTimeAsync(7_000);
		await rejection;
		expect(vi.getTimerCount()).toBe(0);
	});

	test("does not report no match if an edition is replaced by a render error", async () => {
		setSearchPage([resultLink(`${title} (Deluxe Edition)`, albumUrl)]);
		const result = readSpotifySearchPage(artist, title);
		const rejection = expect(result).rejects.toThrow(
			"Spotify search page failed to render",
		);
		await vi.advanceTimersByTimeAsync(1_000);
		vi.stubGlobal("document", {
			querySelector: () => null,
			body: { textContent: "Something went wrong. Reload page" },
		});
		notifyMutation();
		await vi.advanceTimersByTimeAsync(6_000);
		await rejection;
	});

	test("continues observing if the error page disappears without results", async () => {
		vi.stubGlobal("document", {
			querySelector: () => null,
			body: { textContent: "Something went wrong. Reload page" },
		});
		const result = readSpotifySearchPage(artist, title);
		await vi.advanceTimersByTimeAsync(5_000);
		setSearchPage([], "No results found");
		notifyMutation();
		await expect(result).resolves.toBeUndefined();
		expect(vi.getTimerCount()).toBe(0);
	});

	test("rejects when Spotify search results never load", async () => {
		vi.stubGlobal("document", { querySelector: () => null, body: null });

		const result = readSpotifySearchPage(artist, title);
		const rejection = expect(result).rejects.toThrow(
			"Spotify search results did not load",
		);
		await vi.advanceTimersByTimeAsync(7_000);

		await rejection;
	});
});
