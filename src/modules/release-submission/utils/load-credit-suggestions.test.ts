import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { resolveSongCredits } from "~/shared/services/applemusic/credits";
import { resolveSongDetails as resolveDeezerDetails } from "~/shared/services/deezer/credits";
import { createSongCreditsResolver } from "~/shared/services/spotify/credits";
import { loadCreditSuggestions } from "./load-credit-suggestions";

vi.mock("~/shared/services/applemusic/credits", () => ({
	resolveSongCredits: vi.fn(),
}));
vi.mock("~/shared/services/deezer/credits", () => ({
	resolveSongDetails: vi.fn(),
}));
vi.mock("~/shared/services/spotify/credits", () => ({
	createSongCreditsResolver: vi.fn(),
}));
const resolveSpotifyCredits = vi.fn();
beforeEach(() => {
	vi.mocked(createSongCreditsResolver).mockReturnValue(resolveSpotifyCredits);
});
afterEach(() => vi.clearAllMocks());

const appleSong = (id: number) =>
	`https://music.apple.com/us/song/example/${id}`;
const spotifySong = "https://open.spotify.com/track/1234567890123456789012";

test("fetches each unique song once, keeping track order and existing metadata", async () => {
	vi.mocked(resolveSongCredits).mockResolvedValue([
		{ name: "A", role: "producer" },
	]);
	const tracks = [
		{
			position: "1",
			creditsUrl: appleSong(1),
			credits: [{ name: "B", role: "vocals" }],
		},
		{ position: "2", creditsUrl: appleSong(1) },
	];
	const result = await loadCreditSuggestions(tracks, {
		isActive: () => true,
		onProgress: vi.fn(),
	});
	expect(resolveSongCredits).toHaveBeenCalledOnce();
	expect(result.tracks[0]?.credits).toHaveLength(2);
	expect(result.tracks[1]?.credits).toEqual([{ name: "A", role: "producer" }]);
	expect(tracks[0]?.credits).toHaveLength(1);
});

test("limits concurrent requests and does not start more after cancellation", async () => {
	let active = true;
	let finish: (() => void) | undefined;
	const inFlight = new Promise<[]>((resolve) => {
		finish = () => resolve([]);
	});
	vi.mocked(resolveSongCredits).mockReturnValue(inFlight);
	const pending = loadCreditSuggestions(
		Array.from({ length: 6 }, (_, index) => ({
			creditsUrl: appleSong(index + 1),
		})),
		{ isActive: () => active, onProgress: vi.fn() },
	);
	expect(resolveSongCredits).toHaveBeenCalledTimes(3);
	active = false;
	finish?.();
	await pending;
	expect(resolveSongCredits).toHaveBeenCalledTimes(3);
});

test("keeps usable metadata and identifies failed tracks explicitly", async () => {
	vi.mocked(resolveSongCredits).mockRejectedValue(new Error("Unavailable"));
	const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
	try {
		const result = await loadCreditSuggestions(
			[
				{
					position: "B2",
					title: "Track (feat. Guest)",
					creditsUrl: appleSong(1),
				},
			],
			{ isActive: () => true, onProgress: vi.fn() },
		);
		expect(result.failedPositions).toEqual(["B2"]);
		expect(result.tracks[0]?.title).toBe("Track (feat. Guest)");
		expect(warn).toHaveBeenCalledOnce();
	} finally {
		warn.mockRestore();
	}
});

test("dispatches mixed-service credits correctly and caches duplicate Spotify songs", async () => {
	vi.mocked(resolveSongCredits).mockResolvedValue([
		{ name: "Apple Writer", role: "lyrics" },
	]);
	resolveSpotifyCredits.mockResolvedValue([
		{ name: "Spotify Writer", role: "composition" },
	]);
	const isActive = () => true;
	const onProgress = vi.fn();
	const result = await loadCreditSuggestions(
		[
			{
				position: "1",
				creditsUrl: spotifySong,
				credits: [{ name: "Existing", role: "producer" }],
			},
			{ position: "2", creditsUrl: appleSong(1) },
			{ position: "3", creditsUrl: spotifySong },
			{ header: true, creditsUrl: spotifySong },
		],
		{ isActive, onProgress },
	);
	expect(createSongCreditsResolver).toHaveBeenCalledExactlyOnceWith(isActive);
	expect(resolveSpotifyCredits).toHaveBeenCalledExactlyOnceWith(spotifySong);
	expect(resolveSongCredits).toHaveBeenCalledExactlyOnceWith(appleSong(1));
	expect(result.tracks[0]?.credits).toEqual([
		{ name: "Existing", role: "producer" },
		{ name: "Spotify Writer", role: "composition" },
	]);
	expect(result.tracks[1]?.credits).toEqual([
		{ name: "Apple Writer", role: "lyrics" },
	]);
	expect(result.tracks[2]?.credits).toEqual([
		{ name: "Spotify Writer", role: "composition" },
	]);
	expect(result.tracks[3]?.credits).toBeUndefined();
	expect(result.failedPositions).toEqual([]);
	expect(onProgress).toHaveBeenLastCalledWith(3, 3);
});

test("does not reuse a Spotify session resolver across imports", async () => {
	resolveSpotifyCredits.mockResolvedValue([]);
	const options = { isActive: () => true, onProgress: vi.fn() };
	await loadCreditSuggestions([{ creditsUrl: spotifySong }], options);
	await loadCreditSuggestions([{ creditsUrl: spotifySong }], options);
	expect(createSongCreditsResolver).toHaveBeenCalledTimes(2);
	expect(resolveSpotifyCredits).toHaveBeenCalledTimes(2);
});

test("enriches Deezer attribution and credits once per URL while preserving known artist spellings", async () => {
	vi.mocked(resolveDeezerDetails).mockResolvedValue({
		artists: ["1000 EYES", "Tom Schley", "Guest"],
		credits: [
			{ name: "Tom Schley", role: "composition" },
			{ name: "Guest", role: "featured" },
		],
	});
	const creditsUrl = "https://www.deezer.com/track/4266030142";
	const tracks = [
		{
			position: "1",
			title: "Original",
			artists: ["1000 Eyes"],
			creditsUrl,
			credits: [{ name: "Existing", role: "producer" }],
		},
		{ position: "2", artists: ["1000 Eyes"], creditsUrl },
	];
	const original = JSON.stringify(tracks);
	const result = await loadCreditSuggestions(tracks, {
		isActive: () => true,
		onProgress: vi.fn(),
		releaseArtists: ["1000 Eyes", "Tom Schley"],
	});
	expect(resolveDeezerDetails).toHaveBeenCalledExactlyOnceWith(creditsUrl);
	expect(result.tracks.map((track) => track.artists)).toEqual([
		["1000 Eyes", "Tom Schley", "Guest"],
		["1000 Eyes", "Tom Schley", "Guest"],
	]);
	expect(result.tracks[0]?.credits).toEqual([
		{ name: "Existing", role: "producer" },
		{ name: "Tom Schley", role: "composition" },
		{ name: "Guest", role: "featured" },
	]);
	expect(result.tracks[0]?.title).toBe("Original");
	expect(JSON.stringify(tracks)).toBe(original);
	expect(result.failedPositions).toEqual([]);
});

test("dispatches Deezer alongside Apple Music and Spotify without mixing readers", async () => {
	vi.mocked(resolveDeezerDetails).mockResolvedValue({
		artists: ["Deezer Artist"],
		credits: [],
	});
	vi.mocked(resolveSongCredits).mockResolvedValue([]);
	resolveSpotifyCredits.mockResolvedValue([]);
	const result = await loadCreditSuggestions(
		[
			{ creditsUrl: "https://deezer.com/track/1" },
			{ creditsUrl: appleSong(1) },
			{ creditsUrl: spotifySong },
		],
		{ isActive: () => true, onProgress: vi.fn() },
	);
	expect(result.tracks[0]?.artists).toEqual(["Deezer Artist"]);
	expect(result.tracks[1]?.artists).toBeUndefined();
	expect(result.tracks[2]?.artists).toBeUndefined();
	expect(resolveDeezerDetails).toHaveBeenCalledOnce();
	expect(resolveSongCredits).toHaveBeenCalledOnce();
	expect(resolveSpotifyCredits).toHaveBeenCalledOnce();
});

test("retains Deezer's basic attribution and known credits when the detail page fails", async () => {
	vi.mocked(resolveDeezerDetails).mockRejectedValue(
		new Error("Missing page state"),
	);
	const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
	try {
		const result = await loadCreditSuggestions(
			[
				{
					position: "2.1",
					title: "Song [feat. Guest]",
					artists: ["Main"],
					credits: [{ name: "Guest", role: "featured" }],
					creditsUrl: "https://www.deezer.com/track/1",
				},
			],
			{ isActive: () => true, onProgress: vi.fn() },
		);
		expect(result.failedPositions).toEqual(["2.1"]);
		expect(result.tracks[0]?.artists).toEqual(["Main"]);
		expect(result.tracks[0]?.credits).toEqual([
			{ name: "Guest", role: "featured" },
		]);
		expect(warn).toHaveBeenCalledOnce();
	} finally {
		warn.mockRestore();
	}
});

test("does not report cancelled Spotify work as a failure or schedule more songs", async () => {
	let active = true;
	let cancel: (() => void) | undefined;
	const request = new Promise<never>((_resolve, reject) => {
		cancel = () => reject(new Error("Spotify credits loading was cancelled"));
	});
	resolveSpotifyCredits.mockReturnValue(request);
	const onProgress = vi.fn();
	const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
	try {
		const pending = loadCreditSuggestions(
			Array.from({ length: 6 }, (_, index) => ({
				creditsUrl: `https://open.spotify.com/track/${String(index).padStart(22, "0")}`,
			})),
			{ isActive: () => active, onProgress },
		);
		active = false;
		cancel?.();
		const result = await pending;
		expect(resolveSpotifyCredits).toHaveBeenCalledTimes(3);
		expect(result.failedPositions).toEqual([]);
		expect(warn).not.toHaveBeenCalled();
		expect(onProgress).toHaveBeenCalledExactlyOnceWith(0, 6);
	} finally {
		warn.mockRestore();
	}
});

test("retains existing Spotify credits and reports unavailable song credits explicitly", async () => {
	resolveSpotifyCredits.mockRejectedValue(
		new Error("Spotify song credits query failed"),
	);
	const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
	try {
		const result = await loadCreditSuggestions(
			[
				{
					position: "2.3",
					creditsUrl: spotifySong,
					credits: [{ name: "Known", role: "vocals" }],
				},
			],
			{ isActive: () => true, onProgress: vi.fn() },
		);
		expect(result.failedPositions).toEqual(["2.3"]);
		expect(result.tracks[0]?.credits).toEqual([
			{ name: "Known", role: "vocals" },
		]);
		expect(warn).toHaveBeenCalledOnce();
		expect(resolveSongCredits).not.toHaveBeenCalled();
	} finally {
		warn.mockRestore();
	}
});

test.each([
	"https://example.com/song/123",
	"https://open.spotify.com.evil.example/track/1234567890123456789012",
	"http://music.apple.com/us/song/example/123",
	"https://user:password@open.spotify.com/track/1234567890123456789012",
])("reports an unsupported credits source without dispatching it: %s", async (creditsUrl) => {
	const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
	try {
		const result = await loadCreditSuggestions(
			[{ position: "4", creditsUrl }],
			{
				isActive: () => true,
				onProgress: vi.fn(),
			},
		);
		expect(result.failedPositions).toEqual(["4"]);
		expect(resolveSongCredits).not.toHaveBeenCalled();
		expect(createSongCreditsResolver).not.toHaveBeenCalled();
	} finally {
		warn.mockRestore();
	}
});
