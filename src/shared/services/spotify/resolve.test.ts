import { beforeEach, describe, expect, test, vi } from "vitest";

import { getGuestArtists } from "~/modules/release-submission/utils/guest-credits";
import { getSuggestedCredits } from "~/modules/release-submission/utils/suggested-credits";
import {
	getInitialTrackChoices,
	withChoice,
} from "~/modules/release-submission/utils/track-artist-choices";
import {
	getDistinctTrackArtists,
	prefixesTrackArtists,
} from "~/modules/release-submission/utils/track-artist-links";
import { formatTracks } from "~/modules/release-submission/utils/tracklist";
import {
	applyChoices,
	createPickerState,
} from "~/modules/release-submission/utils/tracklist-picker-state";
import { fetch } from "~/shared/utils/fetch";
import { requestToken } from "./auth";
import type {
	AlbumObject,
	ArtistObject,
	SimplifiedTrackObject,
	TrackObject,
} from "./codecs";
import { resolve } from "./resolve";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));
vi.mock("./auth", () => ({ requestToken: vi.fn() }));

const albumId = "1234567890123456789012";
const trackId = "abcdefghijklmnopqrstuv";
const albumUrl = `https://open.spotify.com/album/${albumId}`;
const trackUrl = `https://open.spotify.com/track/${trackId}`;

const artist = (name: string): ArtistObject => ({
	name,
	id: name,
	type: "artist",
	uri: `spotify:artist:${name}`,
	href: `https://api.spotify.com/v1/artists/${name}`,
	external_urls: { spotify: `https://open.spotify.com/artist/${name}` },
});

const song = (
	name: string,
	names: string[],
	track_number: number,
	disc_number = 1,
): SimplifiedTrackObject => ({
	id: `${String(disc_number).padStart(11, "0")}${String(track_number).padStart(11, "0")}`,
	name,
	artists: names.map(artist),
	track_number,
	disc_number,
	duration_ms: 187_000,
});

const album = (): AlbumObject => ({
	album_type: "album",
	artists: [artist("Main Artist")],
	copyrights: [{ text: "© 2025 Example Label" }],
	external_urls: { spotify: albumUrl },
	images: [{ width: 640, height: 640, url: "https://example.com/cover.jpg" }],
	name: "Example Album",
	release_date: "2025-08-01",
	tracks: {
		href: `https://api.spotify.com/v1/albums/${albumId}/tracks`,
		items: [
			song(
				"First Song (feat. Guest Artist)",
				["Main Artist", "Guest Artist"],
				1,
			),
			song("Second Song", ["Main Artist"], 2),
		],
		limit: 50,
		next: null,
		offset: 0,
		previous: null,
		total: 2,
	},
});

describe("Spotify imports", () => {
	beforeEach(() => {
		vi.mocked(requestToken).mockReset().mockResolvedValue({
			access_token: "test-token",
			expires_in: 3600,
			token_type: "Bearer",
		});
		vi.mocked(fetch).mockReset().mockResolvedValue(JSON.stringify(album()));
	});

	test("preserves per-track attribution without inserting artists into raw titles", async () => {
		const data = await resolve(albumUrl);
		expect(data).toMatchObject({
			url: albumUrl,
			title: "Example Album",
			artists: ["Main Artist"],
			date: { year: 2025, month: 8, day: 1 },
			label: { name: "Example Label" },
			tracks: [
				{
					position: "1",
					title: "First Song (feat. Guest Artist)",
					duration: "3:07",
					artists: ["Main Artist", "Guest Artist"],
				},
				{
					position: "2",
					title: "Second Song",
					duration: "3:07",
					artists: ["Main Artist"],
				},
			],
		});
		expect(fetch).toHaveBeenCalledOnce();
		expect(fetch).toHaveBeenCalledWith({
			url: `https://api.spotify.com/v1/albums/${albumId}`,
			headers: { Authorization: "Bearer test-token" },
		});
	});

	test("routes ordinary-album featured artists to suggestions instead of duplicate guests", async () => {
		const { tracks = [], artists = [] } = await resolve(albumUrl);
		expect(prefixesTrackArtists(tracks, artists)).toBe(false);
		expect(getGuestArtists(tracks, artists)).toEqual([]);
		expect(getSuggestedCredits(tracks)).toMatchObject([
			{ name: "Guest Artist", role: "featured", positions: ["1"] },
		]);
		expect(
			getInitialTrackChoices(getDistinctTrackArtists(tracks), artists),
		).toEqual(new Map([["Main Artist", { kind: "skipped" }]]));
		expect(formatTracks(tracks, "as-is")).toBe(
			"1|First Song|3:07\n2|Second Song|3:07",
		);
		expect(tracks[0]?.title).toBe("First Song (feat. Guest Artist)");
		expect(getSuggestedCredits(tracks)).toHaveLength(1);
	});

	test("collects attribution across pages and preserves disc positions and order", async () => {
		const source = album();
		const next = `${source.tracks.href}?offset=1&limit=1`;
		source.tracks.items = [song("Disc One", ["Main Artist"], 1)];
		source.tracks.next = next;
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(JSON.stringify(source))
			.mockResolvedValueOnce(
				JSON.stringify({
					...source.tracks,
					items: [song("Disc Two", ["Other Artist", "Guest Artist"], 1, 2)],
					next: null,
				}),
			);
		const { tracks = [] } = await resolve(albumUrl);
		expect(tracks).toEqual([
			{
				position: "1.1",
				title: "Disc One",
				duration: "3:07",
				artists: ["Main Artist"],
				creditsUrl: "https://open.spotify.com/track/0000000000100000000001",
			},
			{
				position: "2.1",
				title: "Disc Two",
				duration: "3:07",
				artists: ["Other Artist", "Guest Artist"],
				creditsUrl: "https://open.spotify.com/track/0000000000200000000001",
			},
		]);
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(fetch).toHaveBeenLastCalledWith({
			url: next,
			headers: { Authorization: "Bearer test-token" },
		});
		expect(getGuestArtists(tracks, ["Main Artist"])).toEqual([
			{ name: "Other Artist", positions: ["2.1"] },
			{ name: "Guest Artist", positions: ["2.1"] },
		]);
	});

	test.each([
		["Various Artists", "First Artist", "Second Artist"],
		["Main Artist", "Main Artist", "Other Artist"],
	])("uses shared track-linking behavior for %s releases, without an unsupported-link alert", async (release, first, second) => {
		const source = album();
		source.artists = [artist(release)];
		source.tracks.items = [
			song("First Song", [first], 1),
			song("Second Song", [second], 2),
		];
		vi.mocked(fetch).mockResolvedValueOnce(JSON.stringify(source));
		const { tracks = [], artists = [] } = await resolve(albumUrl);
		expect(prefixesTrackArtists(tracks, artists)).toBe(true);
		expect(tracks.map((track) => track.title)).toEqual([
			"First Song",
			"Second Song",
		]);
		expect(tracks.map((track) => track.artists)).toEqual([[first], [second]]);
	});

	test("preserves exact artist names with separators in featured annotations", async () => {
		const source = album();
		source.tracks.items = source.tracks.items.map((track) => ({
			...track,
			name: `${track.name.split(" (")[0]} [featuring Duo & Friend]`,
			artists: [artist("Main Artist"), artist("Duo & Friend")],
		}));
		vi.mocked(fetch).mockResolvedValueOnce(JSON.stringify(source));
		const { tracks = [] } = await resolve(albumUrl);
		expect(getSuggestedCredits(tracks)).toMatchObject([
			{ name: "Duo & Friend", role: "featured", positions: [] },
		]);
	});

	test("supports alias-preserving partial Add and Leave out without restoring feature tags", async () => {
		const { tracks = [], artists = [] } = await resolve(albumUrl);
		const names = getDistinctTrackArtists(tracks);
		const session = { tracks, names };
		const releaseLabels = new Map([["Main Artist", "[Artist123,Main Artist]"]]);
		let state = createPickerState(
			formatTracks(tracks, "as-is"),
			getInitialTrackChoices(names, artists),
		);
		state = applyChoices(
			{
				...state,
				choices: withChoice(state.choices, "Main Artist", {
					kind: "following",
					releaseName: "Main Artist",
				}),
			},
			session,
			releaseLabels,
			true,
		);
		expect(state.text).toBe(
			"1|[Artist123,Main Artist] - First Song|3:07\n2|[Artist123,Main Artist] - Second Song|3:07",
		);
		state = applyChoices(
			{
				...state,
				choices: withChoice(state.choices, "Main Artist", { kind: "skipped" }),
			},
			session,
			releaseLabels,
		);
		expect(state.text).toBe("1|First Song|3:07\n2|Second Song|3:07");
		expect(state.appliedPlan.size).toBe(2);
	});

	test("preserves artist attribution and featured suggestions for track links", async () => {
		const source: TrackObject = {
			album: album(),
			artists: [artist("Main Artist"), artist("Guest Artist")],
			duration_ms: 187_000,
			external_urls: { spotify: trackUrl },
			name: "Single Song [feat. Guest Artist]",
		};
		vi.mocked(fetch).mockResolvedValueOnce(JSON.stringify(source));
		const data = await resolve(trackUrl);
		expect(data).toMatchObject({
			url: trackUrl,
			type: "single",
			artists: ["Main Artist", "Guest Artist"],
			tracks: [
				{
					position: "1",
					title: source.name,
					duration: "3:07",
					artists: ["Main Artist", "Guest Artist"],
					creditsUrl: trackUrl,
				},
			],
		});
		expect(getSuggestedCredits(data.tracks ?? [])).toMatchObject([
			{ name: "Guest Artist", role: "featured", positions: [] },
		]);
		expect(formatTracks(data.tracks ?? [], "as-is")).toBe("1|Single Song|3:07");
		expect(fetch).toHaveBeenCalledOnce();
	});

	test("supplies canonical credit references without fetching or fabricating role credits during the core import", async () => {
		const { tracks = [] } = await resolve(albumUrl);
		for (const track of tracks) {
			expect(track.credits).toBeUndefined();
		}
		expect(tracks.map((track) => track.creditsUrl)).toEqual([
			"https://open.spotify.com/track/0000000000100000000001",
			"https://open.spotify.com/track/0000000000100000000002",
		]);
		expect(fetch).toHaveBeenCalledOnce();
	});

	test("reports a failed track page instead of returning a partial release", async () => {
		const source = album();
		source.tracks.next = `${source.tracks.href}?offset=2`;
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(JSON.stringify(source))
			.mockRejectedValueOnce(new Error("Spotify track page unavailable"));
		await expect(resolve(albumUrl)).rejects.toThrow(
			"Spotify track page unavailable",
		);
	});
});
