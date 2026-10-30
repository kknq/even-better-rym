// @vitest-environment jsdom

import { beforeEach, expect, test, vi } from "vitest";
import { getSuggestedCredits } from "~/modules/release-submission/utils/suggested-credits";
import { prefixesTrackArtists } from "~/modules/release-submission/utils/track-artist-links";
import { fetch } from "~/shared/utils/fetch";
import { resolve } from "./resolve";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));

beforeEach(() => {
	vi.mocked(fetch).mockReset();
});

test("imports release and track-specific description credits from Bandcamp", async () => {
	const release = {
		id: 123,
		album_release_date: null,
		artist: "Pagegirl",
		current: {
			about: "Written from January-July 2025",
			credits: `Eden Brown (Vocals/Melodica)
Leah Rickman(Guitar)
Myles Willis(Drums)
Peter Green(Bass)

Engineered by Callum Underwood
Additional vocals on track 2 by Peter
Keyboard on track 4 by Myles
Sample on track 4 from Mysterious Skin`,
			release_date: null,
			publish_date: "",
			title: "Carry Me Along, Blind Dog",
		},
		item_type: "album",
		trackinfo: [
			{ duration: 180, title: "First", track_num: 1 },
			{ duration: 180, title: "Second", track_num: 2 },
			{ duration: 180, title: "Third", track_num: 3 },
			{ duration: 180, title: "Fourth", track_num: 4 },
		],
		url: "https://pagegirl.bandcamp.com/album/carry-me-along-blind-dog",
	};
	const encoded = JSON.stringify(release)
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;");
	vi.mocked(fetch).mockResolvedValue(
		`<script data-tralbum="${encoded}"></script>`,
	);

	const result = await resolve(release.url);

	expect(result.tracks?.map((track) => track.credits)).toEqual([
		[
			{ name: "Eden Brown", role: "vocals" },
			{ name: "Eden Brown", role: "melodica" },
			{ name: "Leah Rickman", role: "guitar" },
			{ name: "Myles Willis", role: "drums" },
			{ name: "Peter Green", role: "bass" },
			{ name: "Callum Underwood", role: "engineer" },
		],
		[
			{ name: "Eden Brown", role: "vocals" },
			{ name: "Eden Brown", role: "melodica" },
			{ name: "Leah Rickman", role: "guitar" },
			{ name: "Myles Willis", role: "drums" },
			{ name: "Peter Green", role: "bass" },
			{ name: "Callum Underwood", role: "engineer" },
			{ name: "Peter", role: "additional vocals" },
		],
		[
			{ name: "Eden Brown", role: "vocals" },
			{ name: "Eden Brown", role: "melodica" },
			{ name: "Leah Rickman", role: "guitar" },
			{ name: "Myles Willis", role: "drums" },
			{ name: "Peter Green", role: "bass" },
			{ name: "Callum Underwood", role: "engineer" },
		],
		[
			{ name: "Eden Brown", role: "vocals" },
			{ name: "Eden Brown", role: "melodica" },
			{ name: "Leah Rickman", role: "guitar" },
			{ name: "Myles Willis", role: "drums" },
			{ name: "Peter Green", role: "bass" },
			{ name: "Callum Underwood", role: "engineer" },
			{ name: "Myles", role: "keyboard" },
			{ name: "Mysterious Skin", role: "sample" },
		],
	]);
	expect(getSuggestedCredits(result.tracks ?? [])).toContainEqual(
		expect.objectContaining({
			name: "Peter",
			role: "additional vocals",
			positions: ["2"],
		}),
	);
	expect(fetch).toHaveBeenCalledOnce();
});

test("keeps the normal metadata import when no description credits match", async () => {
	const release = {
		id: 456,
		album_release_date: null,
		artist: "Thousand Eyes",
		current: {
			about: "Music from the video game VHOLUME",
			credits: null,
			release_date: null,
			publish_date: "",
			title: "VHOLUME (Original Soundtrack)",
		},
		item_type: "album",
		trackinfo: [{ duration: 180, title: "Song", track_num: 1 }],
		url: "https://thousandeyes.bandcamp.com/album/vholume-original-soundtrack",
	};
	const encoded = JSON.stringify(release)
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;");
	vi.mocked(fetch).mockResolvedValue(
		`<script data-tralbum="${encoded}"></script>`,
	);

	const result = await resolve(release.url);

	expect(result.tracks).toEqual([
		{ position: "1", title: "Song", duration: "3:00" },
	]);
});

test("imports track artists and marks an explicitly described compilation as Various Artists", async () => {
	const release = {
		id: 789,
		album_release_date: null,
		artist: "Sello Impermanente",
		current: {
			about:
				"'Latinameric Anfútbol' es un split/compilación de 9 canciones inéditas pertenecientes a 9 conjuntos musicales.",
			credits:
				"Máster: Julián Brunde\nEdición / Distribución: Sello Impermanente\nArte de tapa: @noctan1000000 en Instagram",
			release_date: null,
			publish_date: "",
			title: "Latinameric Anfútbol",
		},
		item_type: "album",
		trackinfo: [
			{
				artist: "Cámara Chilena De La Destrucción",
				duration: 180,
				title: "Cámara Chilena De La Destrucción - GTA Santiago",
				track_num: 1,
			},
			{
				artist: "Kidchen",
				duration: 180,
				title: "Kidchen - Asamblea Internacional de Máscaras",
				track_num: 2,
			},
			{
				artist: "Honey Pot!",
				duration: 180,
				title: "Honey Pot! - Abney",
				track_num: 3,
			},
		],
		url: "https://selloimpermanente.bandcamp.com/album/latinameric-anf-tbol",
	};
	const encoded = JSON.stringify(release)
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;");
	vi.mocked(fetch).mockResolvedValue(
		`<script data-tralbum="${encoded}"></script>`,
	);

	const result = await resolve(release.url);

	expect(result.artists).toEqual(["Various Artists"]);
	expect(result.tracks?.map(({ artists }) => artists)).toEqual([
		["Cámara Chilena De La Destrucción"],
		["Kidchen"],
		["Honey Pot!"],
	]);
	expect(result.tracks?.map(({ title }) => title)).toEqual([
		"GTA Santiago",
		"Asamblea Internacional de Máscaras",
		"Abney",
	]);
	expect(result.tracks?.map(({ credits }) => credits?.[0])).toEqual([
		{ name: "Julián Brunde", role: "mastering engineer" },
		{ name: "Julián Brunde", role: "mastering engineer" },
		{ name: "Julián Brunde", role: "mastering engineer" },
	]);
});

test.each([
	["Artist - Song - Version", "Artist", "Song - Version"],
	["artist – Song", "Artist", "Song"],
	["Artist — Song", "Artist", "Song"],
	["AC - DC - Song", "AC - DC", "Song"],
	["Other Artist - Song", "Artist", "Other Artist - Song"],
	["Artist - Song", null, "Artist - Song"],
	["Artist - ", "Artist", "Artist - "],
	["Artist-Song", "Artist", "Artist-Song"],
	["Song - Version", "Artist", "Song - Version"],
])("separates only metadata-confirmed artist prefixes in %j", async (title, artist, expected) => {
	const release = {
		id: 1,
		artist: "Release Artist",
		item_type: "album",
		current: { title: "Album" },
		trackinfo: [{ title, artist, duration: 180, track_num: 1 }],
	};
	vi.mocked(fetch).mockResolvedValue(
		`<script data-tralbum="${JSON.stringify(release).replaceAll('"', "&quot;")}"></script>`,
	);
	const result = await resolve("https://example.bandcamp.com/album/example");
	expect(result.tracks?.[0]).toEqual({
		position: "1",
		title: expected,
		duration: "3:00",
		...(artist ? { artists: [artist] } : {}),
	});
});

test("keeps source artists through the duration fallback and joins by position, not array order", async () => {
	const release = {
		id: 1,
		artist: "Various Artists",
		item_type: "album",
		current: { title: "Album" },
		trackinfo: [
			{ title: "First - One", artist: "First", duration: 0, track_num: 1 },
			{ title: "Second - Two", artist: "Second", duration: 0, track_num: 2 },
		],
	};
	const player = {
		tracks: [
			{ title: "Second - Two", duration: 120, tracknum: 1 },
			{ title: "First - One", duration: 180, tracknum: 0 },
		],
	};
	vi.mocked(fetch)
		.mockResolvedValueOnce(
			`<script data-tralbum="${JSON.stringify(release).replaceAll('"', "&quot;")}"></script>`,
		)
		.mockResolvedValueOnce(
			`<div data-player-data="${JSON.stringify(player).replaceAll('"', "&quot;")}"></div>`,
		);
	const result = await resolve("https://example.bandcamp.com/album/example");
	expect(result.tracks).toEqual([
		{ position: "2", title: "Two", artists: ["Second"], duration: "2:00" },
		{ position: "1", title: "One", artists: ["First"], duration: "3:00" },
	]);
});

test("separates confirmed artist attribution on a single-track import", async () => {
	const release = {
		id: 1,
		artist: "First",
		item_type: "track",
		current: { title: "One" },
		trackinfo: [{ title: "First - One", artist: "First", duration: 180 }],
	};
	vi.mocked(fetch).mockResolvedValue(
		`<script data-tralbum="${JSON.stringify(release).replaceAll('"', "&quot;")}"></script>`,
	);
	const result = await resolve("https://example.bandcamp.com/track/one");
	expect(result.tracks).toEqual([
		{ title: "One", artists: ["First"], duration: "3:00" },
	]);
});

test.each([
	false,
	true,
])("reuses known artists for a VHOLUME collaboration (embed fallback: %j)", async (embedFallback) => {
	const release = {
		id: 1,
		artist: "1000 Eyes",
		item_type: "album",
		current: { title: "VHOLUME (Original Soundtrack)" },
		trackinfo: [
			{ title: "vholume", artist: null, duration: 180, track_num: 1 },
			{
				title: "Konstantin Schimanowski - conaptend",
				artist: "Konstantin Schimanowski",
				duration: 180,
				track_num: 2,
			},
			{
				title: "Konstantin Schimanowski, 1000 Eyes - dam",
				artist: "Konstantin Schimanowski, 1000 Eyes",
				duration: embedFallback ? 0 : 180,
				track_num: 3,
			},
		],
	};
	vi.mocked(fetch).mockResolvedValueOnce(
		`<script data-tralbum="${JSON.stringify(release).replaceAll('"', "&quot;")}"></script>`,
	);
	if (embedFallback) {
		const player = {
			tracks: release.trackinfo.map((track) => ({
				title: track.title,
				duration: 180,
				tracknum: track.track_num - 1,
			})),
		};
		vi.mocked(fetch).mockResolvedValueOnce(
			`<div data-player-data="${JSON.stringify(player).replaceAll('"', "&quot;")}"></div>`,
		);
	}
	const result = await resolve(
		"https://thousandeyes.bandcamp.com/album/vholume-original-soundtrack",
	);
	expect(result.artists).toEqual(["1000 Eyes"]);
	expect(result.tracks?.map(({ artists }) => artists)).toEqual([
		undefined,
		["Konstantin Schimanowski"],
		["Konstantin Schimanowski", "1000 Eyes"],
	]);
	expect(result.tracks?.map(({ title }) => title)).toEqual([
		"vholume",
		"conaptend",
		"dam",
	]);
});

test.each([
	[
		"Earth, Wind & Fire",
		["Earth", "Wind & Fire"],
		"Earth, Wind & Fire",
		["Earth, Wind & Fire"],
	],
	["1000 Eyes", ["Guest"], "Guest, Unknown", ["Guest, Unknown"]],
])("preserves unconfirmed or complete release names in track artist %j", async (artist, otherArtists, combined, expected) => {
	const release = {
		id: 1,
		artist,
		item_type: "album",
		current: { title: "Album" },
		trackinfo: [...otherArtists, combined].map((name, index) => ({
			title: `${name} - Song ${index + 1}`,
			artist: name,
			duration: 180,
			track_num: index + 1,
		})),
	};
	vi.mocked(fetch).mockResolvedValue(
		`<script data-tralbum="${JSON.stringify(release).replaceAll('"', "&quot;")}"></script>`,
	);
	const result = await resolve("https://example.bandcamp.com/album/example");
	expect(result.tracks?.at(-1)?.artists).toEqual(expected);
});

test("imports Barbelith and Trhä as separate release artists on their split", async () => {
	const release = {
		id: 1,
		artist: "Barbelith, Trhä",
		item_type: "album",
		current: {
			title: "BARBELITH / TRHÄ",
			about:
				"an epic, fully collaborative split between the two projects. Written together in a single room during December of 2024- January 2025. All members wrote, reordered and performed on every track. Recorded at Magpie Cage studio in Baltimore by Matt Redenbo and mastered by Kevin Bernsten of Developing Nations.",
		},
		trackinfo: [
			{
				title: "Barbelith - ABOLITIONIST",
				artist: "Barbelith",
				duration: 180,
				track_num: 1,
			},
			{
				title: "Trhä - GËS’ËMHÉLAEDËNO£",
				artist: "Trhä",
				duration: 180,
				track_num: 2,
			},
			{
				title: "Barbelith - KARMA",
				artist: "Barbelith",
				duration: 180,
				track_num: 3,
			},
			{
				title: "Trhä - QEVO£CAWMAHA£",
				artist: "Trhä",
				duration: 180,
				track_num: 4,
			},
		],
	};
	vi.mocked(fetch).mockResolvedValue(
		`<script data-tralbum="${JSON.stringify(release).replaceAll('"', "&quot;")}"></script>`,
	);

	const result = await resolve(
		"https://barbelith.bandcamp.com/album/barbelith-trh",
	);

	expect(result.artists).toEqual(["Barbelith", "Trhä"]);
	expect(result.tracks?.map(({ credits }) => credits)).toEqual(
		Array.from({ length: 4 }, () => [
			{ name: "Matt Redenbo", role: "recording engineer" },
			{ name: "Kevin Bernsten", role: "mastering engineer" },
		]),
	);
	expect(result.tracks?.map(({ artists }) => artists)).toEqual([
		["Barbelith"],
		["Trhä"],
		["Barbelith"],
		["Trhä"],
	]);
	expect(result.tracks?.map(({ title }) => title)).toEqual([
		"ABOLITIONIST",
		"GËS’ËMHÉLAEDËNO£",
		"KARMA",
		"QEVO£CAWMAHA£",
	]);
	expect(prefixesTrackArtists(result.tracks ?? [], result.artists ?? [])).toBe(
		true,
	);
});

test.each([
	["Barbelith, Trhä", ["BARBELITH", "trhä"], ["Barbelith", "Trhä"]],
	["Barbelith, Trhä", ["Barbelith", null], ["Barbelith, Trhä"]],
	["Barbelith, Trhä", ["Barbelith", "Guest"], ["Barbelith, Trhä"]],
	[
		"Earth, Wind & Fire",
		["Earth, Wind & Fire", "Guest"],
		["Earth, Wind & Fire"],
	],
	[
		"Earth, Wind & Fire",
		["Earth", "Wind & Fire", "Earth, Wind & Fire"],
		["Earth, Wind & Fire"],
	],
	["Barbelith", ["Barbelith", "Trhä"], ["Barbelith"]],
])("splits %j only with confirming individual track artists %j", async (artist, trackArtists, expected) => {
	const release = {
		id: 1,
		artist,
		item_type: "album",
		current: { title: "Album" },
		trackinfo: trackArtists.map((name, index) => ({
			title: `Song ${index + 1}`,
			artist: name,
			duration: 180,
			track_num: index + 1,
		})),
	};
	vi.mocked(fetch).mockResolvedValue(
		`<script data-tralbum="${JSON.stringify(release).replaceAll('"', "&quot;")}"></script>`,
	);
	const result = await resolve("https://example.bandcamp.com/album/example");
	expect(result.artists).toEqual(expected);
});
