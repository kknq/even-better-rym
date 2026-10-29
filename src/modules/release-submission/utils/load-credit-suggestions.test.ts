import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { resolveSongCredits } from "~/shared/services/applemusic/credits";
import { createSongCreditsResolver } from "~/shared/services/spotify/credits";
import { loadCreditSuggestions } from "./load-credit-suggestions";

vi.mock("~/shared/services/applemusic/credits", () => ({
	resolveSongCredits: vi.fn(),
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
