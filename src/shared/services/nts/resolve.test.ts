// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetch } from "~/shared/utils/fetch";
import { NTS } from "./index";
import { resolve } from "./resolve";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));
const { get } = vi.hoisted(() => ({
	get: vi.fn<(key: string) => Promise<unknown>>(),
}));
vi.mock("~/shared/utils/cache", () => ({
	withCache:
		(_key: string, resolve: (url: string) => Promise<unknown>) =>
		async (url: string) =>
			(await get(url)) ?? resolve(url),
}));

const breakfastUrl =
	"https://www.nts.live/shows/breakfast/episodes/breakfast-nic-tasker-18th-june-2026";
const guestUrl =
	"https://www.nts.live/shows/guests/episodes/yhwh-nailgun-13th-august-2025";
const image =
	"https://media2.ntslive.co.uk/resize/1600x1600/401e20a1-0c4d-4010-9a3e-b850914da8ce_1742083200.jpeg";
const breakfastHtml = `
	<meta property="og:image" content="${image}">
	<div class="episode__header">
		<h1 class="episode__heading">The NTS Breakfast Show w/ NIC TASKER</h1>
	</div>
	<span class="bio__broadcast-date">18 Jun 2026</span>
	<ul class="tracklist__tracks">
		<li class="track"><div class="track__detail">
			<span class="track__timestamp">--:--</span>
			<div class="track__artists">
				<span class="track__artist">Evan Parker With Birds</span><span class="track__artist track__artist--mobile" style="display:none">Evan Parker With Birds</span>
			</div>
			<div class="track__title">Side A / Track 2</div>
		</div></li>
		<li class="track"><div class="track__detail">
			<span class="track__timestamp">0:03:30</span>
			<div class="track__artists"><span class="track__artist">Aly Bain</span><span class="track__artist track__artist--mobile" style="display:none">Aly Bain</span></div>
			<div class="track__title">Niel Gow's Lament For His Second Wife</div>
		</div></li>
	</ul>
`;

describe("NTS", () => {
	beforeEach(() => {
		vi.mocked(fetch).mockReset();
		get.mockReset().mockResolvedValue(undefined);
		vi.mocked(fetch).mockResolvedValue(breakfastHtml);
	});

	test.each([
		breakfastUrl,
		guestUrl,
		`${guestUrl}/`,
		`${guestUrl}?utm_source=test#tracklist`,
		guestUrl.replace("www.", ""),
		guestUrl.replace("https:", "http:"),
	])("recognizes episode URL %s", (url) => {
		expect(NTS.regex.test(url)).toBe(true);
	});

	test.each([
		"https://www.nts.live/shows/breakfast",
		"https://www.nts.live/artists/126046-yhwh-nailgun",
		"https://www.nts.live/shows/breakfast/episodes/",
		`${guestUrl}/unrelated`,
		"https://www.nts.live.evil.example/shows/guests/episodes/example",
		`https://example.com/${guestUrl}`,
	])("does not recognize non-episode URL %s", (url) => {
		expect(NTS.regex.test(url)).toBe(false);
	});

	test("imports breakfast metadata, plain artist/title text, and full-quality cover", async () => {
		expect(await resolve(breakfastUrl)).toEqual({
			url: breakfastUrl,
			title: "The NTS Breakfast Show",
			artists: ["NIC TASKER"],
			artistMode: "text",
			date: { year: 2026, month: 6, day: 18 },
			type: "dj mix",
			format: "digital file",
			attributes: ["streaming"],
			classifiers: ["[Descriptor60311]"],
			label: { id: 897, name: "(No Label)", catno: "n/a" },
			filedUnderCreditRole: "DJ mixing",
			tracks: [
				{ position: "1", title: "Evan Parker With Birds - Side A / Track 2" },
				{
					position: "2",
					title: "Aly Bain - Niel Gow's Lament For His Second Wife",
				},
			],
			coverArt: [image.replace("1600x1600", "10000x10000")],
		});
		expect(fetch).toHaveBeenCalledWith({ url: breakfastUrl });
	});

	test("imports guest shows without requiring a w/ heading", async () => {
		vi.mocked(fetch).mockResolvedValue(`
			<div class="episode__header">
				<h1 class="episode__heading">YHWH Nailgun</h1>
				<h2 class="bio-artists"><span class="bio__artist-link">
					<a class="bio__artist-link__a">YHWH Nailgun</a>
				</span></h2>
			</div>
			<span class="bio__broadcast-date">13 Aug 2025</span>
			<ul class="tracklist__tracks"><li class="track">
				<span class="track__timestamp">0:00:22</span>
				<div class="track__artists"><span class="track__artist">STILL</span><span class="track__artist track__artist--mobile">STILL</span></div>
				<div class="track__title">Haile Selassie Is The Micro-Chip</div>
			</li></ul>
		`);
		expect(await resolve(guestUrl)).toMatchObject({
			title: "YHWH Nailgun",
			artists: ["YHWH Nailgun"],
			date: { year: 2025, month: 8, day: 13 },
			tracks: [
				{ position: "1", title: "STILL - Haile Selassie Is The Micro-Chip" },
			],
		});
	});

	test("preserves multiple track artists and decodes HTML entities", async () => {
		vi.mocked(fetch).mockResolvedValue(
			breakfastHtml
				.replace(
					'<div class="track__artists"><span class="track__artist">Aly Bain</span><span class="track__artist track__artist--mobile" style="display:none">Aly Bain</span></div>',
					'<div class="track__artists"><span class="track__artist">Bill Orcutt, </span><span class="track__artist track__artist--mobile">Bill Orcutt, </span><span class="track__artist">Mabe Fratti</span><span class="track__artist track__artist--mobile">Mabe Fratti</span></div>',
				)
				.replace("Niel Gow's Lament For His Second Wife", "A &amp; B"),
		);
		expect((await resolve(breakfastUrl)).tracks?.[1]).toEqual({
			position: "2",
			title: "Bill Orcutt, Mabe Fratti - A & B",
		});
	});

	test("does not import timestamps or embedded durations as track lengths", async () => {
		vi.mocked(fetch).mockResolvedValue(
			`${breakfastHtml}<script id="react-state">window._REACT_STATE_ = {"episode":{"tracklist":[{"offset":210,"duration":190}]}}</script>`,
		);
		const { tracks } = await resolve(breakfastUrl);
		expect(tracks).toHaveLength(2);
		for (const track of tracks ?? []) {
			expect(track).not.toHaveProperty("duration");
			expect(track.title).not.toContain("[Artist");
		}
	});

	test("handles episodes without optional metadata or track artists", async () => {
		vi.mocked(fetch).mockResolvedValue(`
			<h1 class="episode__heading">Guest Show</h1>
			<ul class="tracklist__tracks"><li class="track">
				<div class="track__title">Unknown Artist</div>
			</li></ul>
		`);
		expect(await resolve(guestUrl)).toMatchObject({
			title: "Guest Show",
			artists: ["Guest Show"],
			date: undefined,
			coverArt: undefined,
			tracks: [{ position: "1", title: "Unknown Artist" }],
		});
	});

	test("does not rewrite unrelated image hosts", async () => {
		const otherImage = "https://example.com/resize/1600x1600/cover.jpg";
		vi.mocked(fetch).mockResolvedValue(
			breakfastHtml.replace(image, otherImage),
		);
		expect((await resolve(breakfastUrl)).coverArt).toEqual([otherImage]);
	});

	test("rejects pages without episode details", async () => {
		vi.mocked(fetch).mockResolvedValue("<title>Access denied</title>");
		await expect(resolve(guestUrl)).rejects.toThrow(
			"Could not find NTS episode details",
		);
	});

	test.each([
		"invalid date",
		"31 Apr 2026",
		"18 Xxx 2026",
	])("reports invalid broadcast date %s", async (date) => {
		vi.mocked(fetch).mockResolvedValue(
			breakfastHtml.replace("18 Jun 2026", date),
		);
		await expect(resolve(breakfastUrl)).rejects.toThrow(
			"Could not parse NTS broadcast date",
		);
	});

	test("reports incomplete tracks instead of silently omitting them", async () => {
		vi.mocked(fetch).mockResolvedValue(
			breakfastHtml.replace('class="track__title"', 'class="missing"'),
		);
		await expect(resolve(breakfastUrl)).rejects.toThrow(
			"Could not find NTS track 1 title",
		);
	});

	test("applies NTS defaults even to results cached before they existed", async () => {
		const staleResult = { url: guestUrl, title: "YHWH Nailgun" };
		vi.mocked(get).mockResolvedValue(staleResult);
		expect(await NTS.resolve(guestUrl)).toEqual({
			...staleResult,
			classifiers: ["[Descriptor60311]"],
			label: { id: 897, name: "(No Label)", catno: "n/a" },
			filedUnderCreditRole: "DJ mixing",
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	test("propagates fetch failures", async () => {
		vi.mocked(fetch).mockRejectedValue(new Error("HTTP 403"));
		await expect(resolve(guestUrl)).rejects.toThrow("HTTP 403");
	});
});
