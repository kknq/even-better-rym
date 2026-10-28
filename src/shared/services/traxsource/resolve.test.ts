// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetch } from "~/shared/utils/fetch";
import { Traxsource } from "./index";
import { resolve } from "./resolve";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));
vi.mock("~/shared/utils/cache", () => ({
	withCache: (_key: string, resolve: unknown) => resolve,
}));

const url = "https://www.traxsource.com/title/123/example-ep";
const releaseHtml = `
	<meta property="og:image" content="//geo-static.traxsource.com/files/images/cover.jpg">
	<div class="page-head">
		<h1 class="title">Example EP</h1>
		<div class="artists"><a class="com-artists">Main Artist</a></div>
		<a class="com-label">Example Records</a>
		<div class="cat-rdate">cat/123 | 2025-08-01</div>
	</div>
	<div class="trk-row">
		<div class="tnum">1</div>
		<div class="trk-cell title">
			<a>First &amp; Last</a><span class="version">Original Mix (6:03)</span>
		</div>
		<div class="trk-cell artists"><a class="com-artists">Main Artist</a></div>
		<span class="duration">(6:03)</span>
	</div>
	<div class="trk-row">
		<div class="tnum">2</div>
		<div class="trk-cell title">
			<a>Second Track</a><span class="version">Club Mix (1:02:03)</span>
		</div>
		<div class="trk-cell artists">
			<a class="com-artists">Guest One</a><a class="com-artists">Guest Two</a>
		</div>
	</div>
`;

describe("Traxsource", () => {
	beforeEach(() => {
		vi.mocked(fetch).mockReset();
		vi.mocked(fetch).mockResolvedValue(releaseHtml);
	});

	test.each([
		url,
		"https://traxsource.com/title/123",
		"https://www.traxsource.com/title/123/",
		"https://www.traxsource.com/title/123?utm_source=test",
		"http://www.traxsource.com/title/123/example",
	])("recognizes release URL %s", (url) => {
		expect(Traxsource.regex.test(url)).toBe(true);
	});

	test.each([
		"https://www.traxsource.com/track/123/example",
		"https://www.traxsource.com/artist/123/example",
		"https://www.traxsource.com/title/123abc",
		"https://www.traxsource.com.evil.example/title/123/example",
		"https://example.com/https://www.traxsource.com/title/123/example",
	])("does not recognize non-release URL %s", (url) => {
		expect(Traxsource.regex.test(url)).toBe(false);
	});

	test("imports structured release details and track artists in the supported format", async () => {
		expect(await resolve(url)).toEqual({
			url,
			title: "Example EP",
			artists: ["Main Artist"],
			date: { year: 2025, month: 8, day: 1 },
			tracks: [
				{ position: "1", title: "First & Last", duration: "6:03" },
				{
					position: "2",
					title: "Guest One, Guest Two - Second Track (Club Mix)",
					duration: "62:03",
				},
			],
			type: "ep",
			format: "lossless digital",
			attributes: ["downloadable"],
			label: { name: "Example Records", catno: "cat/123" },
			coverArt: ["https://geo-static.traxsource.com/files/images/cover.jpg"],
		});
		expect(fetch).toHaveBeenCalledWith({ url });
	});

	test("does not prefix collaborators when a release artist is listed in any position", async () => {
		vi.mocked(fetch).mockResolvedValue(
			releaseHtml.replace(
				'<a class="com-artists">Guest One</a><a class="com-artists">Guest Two</a>',
				'<a class="com-artists">Guest One</a><a class="com-artists">Main Artist</a>',
			),
		);
		expect((await resolve(url)).tracks?.[1].title).toBe(
			"Second Track (Club Mix)",
		);
	});

	test("does not prefix a track credited to only one of multiple release artists", async () => {
		vi.mocked(fetch).mockResolvedValue(
			releaseHtml.replace(
				'<div class="artists"><a class="com-artists">Main Artist</a></div>',
				'<div class="artists"><a class="com-artists">Main Artist</a><a class="com-artists">Guest One</a></div>',
			),
		);
		const result = await resolve(url);
		expect(result.tracks?.[0].title).toBe("First & Last");
		expect(result.tracks?.[1].title).toBe("Second Track (Club Mix)");
	});

	test.each([
		"<title>Just a moment...</title>",
		'<title>Verification required</title><form id="challenge-form"></form>',
	])("reports browser verification pages explicitly", async (html) => {
		vi.mocked(fetch).mockResolvedValue(html);
		await expect(resolve(url)).rejects.toThrow(
			"Traxsource returned a Cloudflare verification page",
		);
	});

	test("does not infer missing metadata from unrelated page content", async () => {
		vi.mocked(fetch).mockResolvedValue(`
			<div class="page-head"><h1 class="title">Minimal Release</h1></div>
			<div>Other release | OTHER123 | 2020-01-01</div>
			<a class="com-label">Unrelated Records</a>
			<div class="trk-row"><span class="version">Remix</span></div>
		`);
		expect(await resolve(url)).toMatchObject({
			title: "Minimal Release",
			artists: [],
			date: undefined,
			label: { name: undefined, catno: undefined },
			coverArt: [],
			tracks: [],
		});
	});

	test("does not duplicate a mix name already included in the title", async () => {
		vi.mocked(fetch).mockResolvedValue(
			releaseHtml.replace("Second Track</a>", "Second Track (Club Mix)</a>"),
		);
		const result = await resolve(url);
		expect(result.tracks?.[1].title).toBe(
			"Guest One, Guest Two - Second Track (Club Mix)",
		);
	});

	test("rejects blocked or unsupported pages instead of importing empty data", async () => {
		vi.mocked(fetch).mockResolvedValue("<title>Access denied</title>");
		await expect(resolve(url)).rejects.toThrow(
			"Could not find Traxsource release details",
		);
	});

	test("reports invalid dates", async () => {
		vi.mocked(fetch).mockResolvedValue(
			releaseHtml.replace("2025-08-01", "2025-99-99"),
		);
		await expect(resolve(url)).rejects.toThrow(
			"Could not parse Traxsource release date",
		);
	});

	test("propagates fetch failures", async () => {
		vi.mocked(fetch).mockRejectedValue(new Error("HTTP 403"));
		await expect(resolve(url)).rejects.toThrow("HTTP 403");
	});
});
