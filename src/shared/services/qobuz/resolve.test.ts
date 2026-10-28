// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetch } from "~/shared/utils/fetch";
import { Qobuz } from "./index";
import { resolve } from "./resolve";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));
vi.mock("~/shared/utils/cache", () => ({
	withCache: (_key: string, resolve: unknown) => resolve,
}));

const url =
	"https://www.qobuz.com/us-en/album/discovery-daft-punk/0724384960650";
const albumSchema = {
	"@type": "MusicAlbum",
	name: "Discovery",
	datePublished: "2001-03-07",
};
const html = `
	<script type="application/ld+json">${JSON.stringify(albumSchema)}</script>
	<script type="application/ld+json">{"@type":"BreadcrumbList"}</script>
	<ul><li class="album-meta__item">Main artists:
		<a title="Daft Punk">Daft Punk</a>
	</li></ul>
	<img class="album-cover__image" src="https://static.qobuz.com/images/covers/50/06/0724384960650_600.jpg">
	<li class="album-about__item">Label <a>Daft Life</a></li>
	<div id="playerTracks">
		<div class="track__items" title="One More Time">
			<div class="track__item--number">1</div>
			<span class="track__item--duration">5:20</span>
		</div>
		<div class="track__items" title="Aerodynamic">
			<div class="track__item--number">2</div>
			<span class="track__item--duration">3:32</span>
		</div>
	</div>
`;

describe("Qobuz imports", () => {
	beforeEach(() => {
		vi.mocked(fetch).mockReset().mockResolvedValue(html);
	});

	test.each([
		url,
		url.replace("us-en", "gb-en"),
		`${url}?utm_source=test`,
		"https://open.qobuz.com/album/0724384960650",
		"https://open.qobuz.com/album/abcdef1234/",
	])("recognizes album URL %s", (url) => {
		expect(Qobuz.regex.test(url)).toBe(true);
	});

	test.each([
		"https://open.qobuz.com/artist/123",
		"https://www.qobuz.com/us-en/search/albums/Discovery",
		"https://open.qobuz.com.evil.example/album/123",
		"https://www.qobuz.com/us-en/album/example/123/unrelated",
	])("rejects non-album URL %s", async (url) => {
		expect(Qobuz.regex.test(url)).toBe(false);
		await expect(resolve(url)).rejects.toThrow("Unsupported Qobuz album URL");
		expect(fetch).not.toHaveBeenCalled();
	});

	test("imports album details regardless of JSON-LD script order", async () => {
		expect(await resolve(url)).toEqual({
			url,
			title: "Discovery",
			artists: ["Daft Punk"],
			date: { year: 2001, month: 3, day: 7 },
			type: "single",
			format: "lossless digital",
			attributes: ["downloadable", "streaming"],
			coverArt: [
				"https://static.qobuz.com/images/covers/50/06/0724384960650_max.jpg",
			],
			label: { name: "Daft Life" },
			tracks: [
				{ position: "1", title: "One More Time", duration: "5:20" },
				{ position: "2", title: "Aerodynamic", duration: "3:32" },
			],
		});
	});

	test("accepts lookup's open.qobuz.com URLs and resolves the storefront", async () => {
		await resolve("https://open.qobuz.com/album/0724384960650");
		expect(fetch).toHaveBeenCalledWith({
			url: "https://www.qobuz.com/us-en/album/-/0724384960650",
		});
	});

	test("normalizes localized URLs to English before parsing artist and label text", async () => {
		await resolve(url.replace("us-en", "fr-fr"));
		expect(fetch).toHaveBeenCalledWith({ url });
	});

	test.each([
		JSON.stringify({ "@graph": [albumSchema] }),
		JSON.stringify([{ "@type": "WebSite" }, albumSchema]),
	])("finds album data in grouped JSON-LD %s", async (schema) => {
		vi.mocked(fetch).mockResolvedValue(
			html.replace(JSON.stringify(albumSchema), schema),
		);
		expect((await resolve(url)).title).toBe("Discovery");
	});

	test("reports blocked pages instead of returning empty data", async () => {
		vi.mocked(fetch).mockResolvedValue("<title>Access denied</title>");
		await expect(resolve(url)).rejects.toThrow(
			"Could not find Qobuz album details",
		);
	});

	test("reports incomplete tracklists", async () => {
		vi.mocked(fetch).mockResolvedValue(
			html.replace('title="One More Time"', ""),
		);
		await expect(resolve(url)).rejects.toThrow("Could not parse Qobuz track 1");
	});
});
