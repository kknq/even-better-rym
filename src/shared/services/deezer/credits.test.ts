// @vitest-environment jsdom

import { beforeEach, expect, test, vi } from "vitest";
import { getGuestArtists } from "~/modules/release-submission/utils/guest-credits";
import { loadCreditSuggestions } from "~/modules/release-submission/utils/load-credit-suggestions";
import {
	getNonFeaturedTrackArtists,
	getSuggestedCredits,
} from "~/modules/release-submission/utils/suggested-credits";
import {
	hasDifferingTrackArtists,
	prefixesTrackArtists,
} from "~/modules/release-submission/utils/track-artist-links";
import { fetch } from "~/shared/utils/fetch";
import { readSongDetails, resolveSongDetails } from "./credits";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));

const id = "1189531072";
const data = {
	SNG_ID: id,
	SNG_TITLE: "Go2DaMoon",
	ARTISTS: [{ ART_NAME: "Playboi Carti" }, { ART_NAME: "Kanye West" }],
	SNG_CONTRIBUTORS: {
		main_artist: ["Playboi Carti"],
		featuring: ["Kanye West"],
		composer: ["Jordan Carter", "Kanye West", "Wesley Glass"],
		author: ["Jordan Carter", "Kanye West", "Wesley Glass"],
		mixingengineer: ["Roark Bailey", "Marcus Fitz"],
		recordingengineer: ["Marcus Fitz", "Josh Berg"],
		masteringengineer: ["Collin Leonard"],
	},
};
const page = (value: unknown) =>
	`<script>window.__DZR_APP_STATE__ = ${JSON.stringify({ DATA: value })};</script>`;
const documentFor = (value: unknown) =>
	new DOMParser().parseFromString(page(value), "text/html");

beforeEach(() => {
	vi.mocked(fetch).mockReset().mockResolvedValue(page(data));
});

test("reads actual source-shaped featured, writer, composer and engineering credits without crediting Main", () => {
	const result = readSongDetails(documentFor(data), id);
	expect(result.artists).toEqual(["Playboi Carti", "Kanye West"]);
	expect(result.credits).toContainEqual({
		name: "Kanye West",
		role: "featured",
	});
	expect(result.credits).toContainEqual({
		name: "Kanye West",
		role: "composer",
	});
	expect(result.credits).toContainEqual({
		name: "Kanye West",
		role: "songwriting",
	});
	expect(result.credits).toContainEqual({
		name: "Roark Bailey",
		role: "mixing engineer",
	});
	expect(result.credits).toContainEqual({
		name: "Marcus Fitz",
		role: "recording engineer",
	});
	expect(result.credits).toContainEqual({
		name: "Collin Leonard",
		role: "mastering engineer",
	});
	expect(result.credits).toHaveLength(12);
});

test.each([
	["Zavet", { composer: ["Zavet"] }],
	["BrunuhVille", { composer: ["Bruno Correia"] }],
	[
		"Barbelith",
		{
			composer: ["William Jarboe", "Damián Antón-Ojeda", "Austyn Sullivan"],
			author: ["William Jarboe"],
		},
	],
	["Trhä", { author: ["Damián Antón-Ojeda"] }],
])("retains %s's structured names and roles without splitting them", (name, roles) => {
	const result = readSongDetails(
		documentFor({
			...data,
			ARTISTS: [{ ART_NAME: name }],
			SNG_CONTRIBUTORS: { main_artist: [name], ...roles },
		}),
		id,
	);
	expect(result.artists).toEqual([name]);
	expect(result.credits).toEqual(
		Object.entries(roles).flatMap(([role, names]) =>
			names.map((name) => ({
				name,
				role: role === "composer" ? "composer" : "songwriting",
			})),
		),
	);
});

test("preserves collaborators and does not invent roles for main artist attribution", () => {
	expect(
		readSongDetails(
			documentFor({
				...data,
				ARTISTS: [{ ART_NAME: "1000 EYES" }, { ART_NAME: "Tom Schley" }],
				SNG_CONTRIBUTORS: {
					main_artist: ["1000 EYES", "Tom Schley"],
					composer: ["Tom Schley"],
					masteringengineer: ["Karl Barnes"],
				},
			}),
			id,
		),
	).toEqual({
		artists: ["1000 EYES", "Tom Schley"],
		credits: [
			{ name: "Tom Schley", role: "composer" },
			{ name: "Karl Barnes", role: "mastering engineer" },
		],
	});
});

test("accepts genuinely empty credits and retains unknown source roles for review", () => {
	expect(
		readSongDetails(documentFor({ ...data, SNG_CONTRIBUTORS: {} }), id).credits,
	).toEqual([]);
	expect(
		readSongDetails(
			documentFor({
				...data,
				SNG_CONTRIBUTORS: { guest_vocals: ["A & B"], lyricist: ["Writer"] },
			}),
			id,
		).credits,
	).toEqual([
		{ name: "A & B", role: "guest vocals" },
		{ name: "Writer", role: "lyrics" },
	]);
});

test.each([
	null,
	{ ...data, SNG_ID: "999" },
	{ ...data, SNG_TITLE: "" },
	{ ...data, ARTISTS: [] },
	{ ...data, ARTISTS: [{ ART_NAME: "" }] },
	{ ...data, SNG_CONTRIBUTORS: undefined },
	{ ...data, SNG_CONTRIBUTORS: [] },
	{ ...data, SNG_CONTRIBUTORS: { composer: "Writer" } },
	{ ...data, SNG_CONTRIBUTORS: { composer: [null] } },
	{ ...data, SNG_CONTRIBUTORS: { composer: [""] } },
])("rejects mismatched or malformed page state rather than treating it as no credits (%#)", (value) => {
	expect(() => readSongDetails(documentFor(value), id)).toThrow(
		"Could not parse Deezer",
	);
});

test("does not execute scripts and rejects missing or invalid JSON state", () => {
	const document_ = new DOMParser().parseFromString(
		"<script>throw new Error('not executed')</script>",
		"text/html",
	);
	expect(() => readSongDetails(document_, id)).toThrow("unavailable");
	const malformed = new DOMParser().parseFromString(
		"<script>window.__DZR_APP_STATE__ = {bad};</script>",
		"text/html",
	);
	expect(() => readSongDetails(malformed, id)).toThrow(SyntaxError);
});

test.each([
	`https://www.deezer.com/track/${id}`,
	`https://deezer.com/en-us/track/${id}/?test=1#credits`,
])("fetches a canonical English public track page without cookies: %s", async (url) => {
	await resolveSongDetails(url);
	expect(fetch).toHaveBeenCalledExactlyOnceWith({
		url: `https://www.deezer.com/en/track/${id}`,
		credentials: "omit",
		headers: { "Accept-Language": "en-US,en;q=0.9" },
	});
});

test.each([
	`http://www.deezer.com/track/${id}`,
	`https://www.deezer.com.evil.example/track/${id}`,
	`https://www.deezer.com/album/${id}`,
	`https://www.deezer.com:444/track/${id}`,
	`https://name@www.deezer.com/track/${id}`,
	`https://www.deezer.com/track/${id}abc`,
])("rejects unsupported detail URL before requesting it: %s", async (url) => {
	await expect(resolveSongDetails(url)).rejects.toThrow("Unsupported Deezer");
	expect(fetch).not.toHaveBeenCalled();
});

test("propagates HTTP failures", async () => {
	vi.mocked(fetch).mockRejectedValue(new Error("HTTP 403"));
	await expect(
		resolveSongDetails(`https://www.deezer.com/track/${id}`),
	).rejects.toThrow("HTTP 403");
});

test("shared loading discovers WLR features absent from the API track artist field", async () => {
	const features = new Map([
		["1189531072", "Kanye West"],
		["1189531112", "Kid Cudi"],
		["1189531152", "Future"],
	]);
	vi.mocked(fetch).mockImplementation(({ url }) => {
		const id = url.split("/").at(-1) ?? "";
		const feature = features.get(id);
		return Promise.resolve(
			page({
				...data,
				SNG_ID: id,
				ARTISTS: [{ ART_NAME: "Playboi Carti" }, { ART_NAME: feature }],
				SNG_CONTRIBUTORS: {
					main_artist: ["Playboi Carti"],
					featuring: [feature],
				},
			}),
		);
	});
	const original = [...features.keys()].map((id, index) => ({
		position: ["2", "6", "10"][index],
		title: "Song",
		artists: ["Playboi Carti"],
		creditsUrl: `https://www.deezer.com/track/${id}`,
	}));
	const { tracks, failedPositions } = await loadCreditSuggestions(original, {
		isActive: () => true,
		onProgress: vi.fn(),
		releaseArtists: ["Playboi Carti"],
	});
	expect(failedPositions).toEqual([]);
	expect(getGuestArtists(tracks, ["Playboi Carti"])).toEqual([]);
	expect(tracks.map(getNonFeaturedTrackArtists)).toEqual([
		["Playboi Carti"],
		["Playboi Carti"],
		["Playboi Carti"],
	]);
	expect(
		getSuggestedCredits(tracks).map(({ name, role, positions }) => ({
			name,
			role,
			positions,
		})),
	).toEqual([
		{ name: "Kanye West", role: "featured", positions: ["2"] },
		{ name: "Kid Cudi", role: "featured", positions: ["6"] },
		{ name: "Future", role: "featured", positions: ["10"] },
	]);
	expect(original.map((track) => track.artists)).toEqual([
		["Playboi Carti"],
		["Playboi Carti"],
		["Playboi Carti"],
	]);
});

test("Vholume adds both main artists without treating its second artist as a guest or forcing prefixes", async () => {
	vi.mocked(fetch).mockResolvedValue(
		page({
			...data,
			ARTISTS: [{ ART_NAME: "1000 EYES" }, { ART_NAME: "Tom Schley" }],
			SNG_CONTRIBUTORS: {
				main_artist: ["1000 EYES", "Tom Schley"],
				composer: ["Tom Schley"],
			},
		}),
	);
	const releaseArtists = ["1000 Eyes", "Tom Schley"];
	const { tracks } = await loadCreditSuggestions(
		[
			{
				artists: ["1000 Eyes"],
				creditsUrl: `https://www.deezer.com/track/${id}`,
			},
		],
		{ isActive: () => true, onProgress: vi.fn(), releaseArtists },
	);
	expect(tracks[0]?.artists).toEqual(releaseArtists);
	expect(getGuestArtists(tracks, releaseArtists)).toEqual([]);
	expect(hasDifferingTrackArtists(tracks, releaseArtists)).toBe(false);
	expect(prefixesTrackArtists(tracks, releaseArtists)).toBe(false);
});

test("split-release writers keep their alternating scopes while composers cover every song", async () => {
	vi.mocked(fetch).mockImplementation(({ url }) => {
		const id = url.split("/").at(-1) ?? "";
		const firstArtist = Number(id) % 2 === 1;
		const name = firstArtist ? "Barbelith" : "Trhä";
		return Promise.resolve(
			page({
				...data,
				SNG_ID: id,
				ARTISTS: [{ ART_NAME: name }],
				SNG_CONTRIBUTORS: {
					main_artist: [name],
					composer: ["William Jarboe", "Damián Antón-Ojeda", "Austyn Sullivan"],
					author: [firstArtist ? "William Jarboe" : "Damián Antón-Ojeda"],
				},
			}),
		);
	});
	const artists = ["Barbelith", "Trhä"];
	const { tracks } = await loadCreditSuggestions(
		[1, 2, 3, 4].map((id) => ({
			position: String(id),
			artists: [id % 2 === 1 ? "Barbelith" : "Trhä"],
			creditsUrl: `https://www.deezer.com/track/${id}`,
		})),
		{ isActive: () => true, onProgress: vi.fn(), releaseArtists: artists },
	);
	expect(getGuestArtists(tracks, artists)).toEqual([]);
	expect(prefixesTrackArtists(tracks, artists)).toBe(true);
	const suggestions = getSuggestedCredits(tracks);
	expect(
		suggestions
			.filter((credit) => credit.role === "composer")
			.map((credit) => credit.positions),
	).toEqual([[], [], []]);
	expect(
		suggestions
			.filter((credit) => credit.role === "songwriting")
			.map(({ name, positions }) => ({ name, positions })),
	).toEqual([
		{ name: "William Jarboe", positions: ["1", "3"] },
		{ name: "Damián Antón-Ojeda", positions: ["2", "4"] },
	]);
});
