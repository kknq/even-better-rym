// @vitest-environment jsdom

import { beforeEach, expect, test, vi } from "vitest";
import { getSuggestedCredits } from "~/modules/release-submission/utils/suggested-credits";
import { fetch } from "~/shared/utils/fetch";
import { resolve } from "./resolve";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));
const url =
	"https://www.metal-archives.com/albums/Cannibal_Corpse/Eaten_Back_to_Life/778";

const row = (name: string, role: string) =>
	`<tr class="lineupRow"><td><a href="/artists/Person/123">${name}</a></td><td>${role}</td></tr>`;
const html = (format = "CD") => `
	<h1 class="album_name">Eaten Back to Life</h1>
	<h2 class="band_name"><a>Cannibal Corpse</a></h2>
	<div id="album_info">
		<dl class="float_left"><dt>Type:</dt><dd>Full-length</dd><dt>Date:</dt><dd>August 17th, 1990</dd><dt>Catalog:</dt><dd>9 26461-2</dd><dt>Version:</dt><dd></dd></dl>
		<dl class="float_right"><dt>Label:</dt><dd>Metal Blade Records</dd><dt>Format:</dt><dd>${format}</dd></dl>
	</div>
	<div id="album_tabs_tracklist"><table class="table_lyrics">
		${Array.from({ length: 11 }, (_, i) => `<tr><td>${i + 1}.</td><td class="wrapWords">Song ${i + 1}</td><td align="right">03:00</td></tr><tr><td colspan="3">Hidden lyrics</td></tr>`).join("")}
	</table></div>
	<div id="album_tabs_lineup">
		<div id="album_all_members_lineup"><table>
			<tr class="lineupHeaders"><td>Band members</td></tr>
			${row("Chris Barnes", "Vocals, Lyrics (tracks 1-11)")}
			${row("Jack Owen", "Guitars, Lyrics (tracks 1, 5, 7, 8), Songwriting")}
			${row("Bob Rusay", "Guitars, Songwriting")}
			${row("Alex Webster", "Bass, Lyrics (track 8), Songwriting")}
			${row("Paul Mazurkiewicz", "Drums, Lyrics (track 4), Songwriting")}
			<tr class="lineupHeaders"><td>Guest/Session</td></tr>
			${row("Francis Howard", "Vocals (backing) (tracks 4 &amp; 10)")}
			${row("Glen Benton", "Vocals (backing) (tracks 4 &amp; 10)")}
			<tr class="lineupHeaders"><td>Miscellaneous staff</td></tr>
			${row("Mike Mulley", "Photography")}
			${row("Chris Barnes", "Logo")}
			${row("Brian Ames", "Design")}
			${row("Stephanie Cabral", "Photography (Jack Owen photo)")}
			${row("Vincent Locke", "Cover art, Typography")}
			${row("Scott Burns", "Producer, Engineering")}
		</table></div>
	</div>`;

beforeEach(() => {
	vi.mocked(fetch).mockReset().mockResolvedValue(html());
});

test("imports the captured album's lineup into confirmed and reviewable suggestions in one request", async () => {
	const result = await resolve(url);
	expect(fetch).toHaveBeenCalledExactlyOnceWith({ url });
	expect(result.title).toBe("Eaten Back to Life");
	expect(result.artists).toEqual(["Cannibal Corpse"]);
	expect(result.type).toBe("album");
	expect(result.date).toEqual({ year: 1990, month: 8, day: 17 });
	expect(result.label).toEqual({
		name: "Metal Blade Records",
		catno: "9 26461-2",
	});
	expect(result.format).toBe("cd");
	expect(result.tracks).toHaveLength(11);
	expect(result.tracks?.some((track) => track.artists !== undefined)).toBe(
		false,
	);
	const suggestions = getSuggestedCredits(
		result.tracks ?? [],
		result.releaseCredits,
	);
	expect(suggestions).toContainEqual({
		key: JSON.stringify(["Francis Howard", "backing vocals"]),
		name: "Francis Howard",
		role: "backing vocals",
		positions: ["4", "10"],
	});
	expect(suggestions).toContainEqual({
		key: JSON.stringify(["Alex Webster", "lyrics"]),
		name: "Alex Webster",
		role: "lyrics",
		positions: ["8"],
	});
	expect(result.unverifiedCredits).toBeUndefined();
	expect(result.releaseCredits).toHaveLength(17);
	expect(result.releaseCredits).toContainEqual({
		name: "Scott Burns",
		role: "engineer",
	});
	expect(suggestions.filter((credit) => credit.name === "Scott Burns")).toEqual(
		[
			{
				key: JSON.stringify(["Scott Burns", "producer, engineer"]),
				name: "Scott Burns",
				role: "producer, engineer",
				positions: [],
			},
		],
	);
	expect(suggestions.every((credit) => !credit.unverified)).toBe(true);
	expect(suggestions.some((credit) => credit.name === "Duplicate View")).toBe(
		false,
	);
});

test("does not restore tracks or labels for an unknown format or assign scoped credits to absent songs", async () => {
	vi.mocked(fetch).mockResolvedValue(html("Unknown"));
	const result = await resolve(url);
	expect(result.tracks).toBeUndefined();
	expect(result.label).toBeUndefined();
	expect(result.releaseCredits).toContainEqual({
		name: "Chris Barnes",
		role: "vocals",
	});
	expect(result.unverifiedCredits).toContainEqual({
		name: "Glen Benton",
		role: "vocals (backing) (tracks 4 & 10)",
	});
});

test("preserves Forgotten Paths guest scopes inside vocal qualifiers", async () => {
	vi.mocked(fetch).mockResolvedValue(`
		<h1 class="album_name">Forgotten Paths</h1>
		<h2 class="band_name"><a>Saor</a></h2>
		<div id="album_info"><dl class="float_right"><dt>Label:</dt><dd>Avantgarde Music</dd><dt>Format:</dt><dd>CD</dd></dl></div>
		<div id="album_tabs_tracklist"><table class="table_lyrics">
			${["Forgotten Paths", "Monadh", "Bròn", "Exile"].map((title, index) => `<tr><td>${index + 1}.</td><td class="wrapWords">${title}</td><td align="right">04:50</td></tr>`).join("")}
		</table></div>
		<div id="album_tabs_lineup"><div id="album_all_members_lineup"><table>
			<tr class="lineupHeaders"><td>Band members</td></tr>
			${row("Andy Marshall", "Vocals, Guitars, Bass")}
			<tr class="lineupHeaders"><td>Guest/Session</td></tr>
			${row("Neige", "Vocals (additional, track 1)")}
			${row("Sophie Rogers", "Vocals (female, track 3)")}
			${row("Kevin Murphy", "Bagpipes (track 3)")}
			${row("Carlos Vivas", "Drums")}
		</table></div></div>
	`);
	const result = await resolve(url);
	expect(result.tracks).toHaveLength(4);
	const suggestions = getSuggestedCredits(
		result.tracks ?? [],
		result.releaseCredits,
	);
	expect(suggestions).toContainEqual({
		key: JSON.stringify(["Neige", "vocals (additional)"]),
		name: "Neige",
		role: "vocals (additional)",
		positions: ["1"],
	});
	expect(suggestions).toContainEqual({
		key: JSON.stringify(["Sophie Rogers", "vocals (female)"]),
		name: "Sophie Rogers",
		role: "vocals (female)",
		positions: ["3"],
	});
	expect(suggestions).toContainEqual({
		key: JSON.stringify(["Carlos Vivas", "drums"]),
		name: "Carlos Vivas",
		role: "drums",
		positions: [],
	});
	expect(result.unverifiedCredits).toBeUndefined();
	expect(fetch).toHaveBeenCalledExactlyOnceWith({ url });
});

test("rejects blocked responses and missing lineups instead of caching an empty successful import", async () => {
	vi.mocked(fetch).mockResolvedValue(
		"<html><title>Just a moment...</title></html>",
	);
	await expect(resolve(url)).rejects.toThrow(
		"unavailable or access was blocked",
	);
	vi.mocked(fetch).mockResolvedValue(
		'<h1 class="album_name">Album</h1><h2 class="band_name"><a>Band</a></h2>',
	);
	await expect(resolve(url)).rejects.toThrow("release lineup is unavailable");
});
