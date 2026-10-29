// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { loadCreditSuggestions } from "~/modules/release-submission/utils/load-credit-suggestions";
import { getSuggestedCredits } from "~/modules/release-submission/utils/suggested-credits";
import { fetch } from "~/shared/utils/fetch";
import { createSongCreditsResolver } from "./credits";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));

const firstId = "1234567890123456789012";
const secondId = "abcdefghijklmnopqrstuv";
const firstUrl = `https://open.spotify.com/track/${firstId}`;
const secondUrl = `https://open.spotify.com/track/${secondId}`;
const endpoint = "https://api-partner.spotify.com/pathfinder/v2/query";

type Contributor = { name: string; role: string };
const contributors: Contributor[] = [
	{ name: "Main Artist", role: "Main Artist" },
	{ name: "Writer One", role: "Composer" },
	{ name: "Writer Two", role: "Composer" },
	{ name: "Writer One", role: "Lyricist" },
	{ name: "Producer", role: "Producer" },
	{ name: "Guest", role: "Featured Artist" },
	{ name: "Mixer", role: "Mixing Engineer" },
	{ name: "Player", role: "Guitar" },
];

const creditsResponse = (items: Contributor[] = contributors) =>
	JSON.stringify({
		data: {
			trackUnion: {
				__typename: "Track",
				name: "Example Track",
				artists: { items: [{ uri: "spotify:artist:not-a-rym-link" }] },
				creditsTrait: { contributors: { items } },
			},
		},
	});

const embed = (
	token = "anonymous-test-session",
	expiresAt = Date.now() + 3_600_000,
	isAnonymous = true,
) =>
	`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
		props: {
			pageProps: {
				state: {
					settings: {
						session: {
							accessToken: token,
							accessTokenExpirationTimestampMs: expiresAt,
							isAnonymous,
						},
					},
				},
			},
		},
	})}</script>`;

function queryVariables(body: string | undefined) {
	const request: unknown = JSON.parse(body ?? "");
	if (
		typeof request !== "object" ||
		request === null ||
		!("variables" in request) ||
		typeof request.variables !== "object" ||
		request.variables === null ||
		!("trackUri" in request.variables) ||
		typeof request.variables.trackUri !== "string" ||
		!("contributorsOffset" in request.variables) ||
		typeof request.variables.contributorsOffset !== "number"
	) {
		throw new Error("Invalid credits query variables");
	}
	return {
		trackUri: request.variables.trackUri,
		contributorsOffset: request.variables.contributorsOffset,
	};
}

describe("Spotify song credits", () => {
	beforeEach(() => {
		vi.mocked(fetch)
			.mockReset()
			.mockImplementation(({ url }) =>
				Promise.resolve(
					url.startsWith("https://open.spotify.com/embed/track/")
						? embed()
						: creditsResponse(),
				),
			);
	});
	afterEach(() => vi.useRealTimers());

	test("loads grouped web-player credits anonymously and normalizes roles without duplicating main artists", async () => {
		const resolve = createSongCreditsResolver();
		await expect(resolve(firstUrl)).resolves.toEqual([
			{ name: "Writer One", role: "composition" },
			{ name: "Writer Two", role: "composition" },
			{ name: "Writer One", role: "lyrics" },
			{ name: "Producer", role: "producer" },
			{ name: "Guest", role: "featured" },
			{ name: "Mixer", role: "mixing" },
			{ name: "Player", role: "guitar" },
		]);
		expect(fetch).toHaveBeenNthCalledWith(1, {
			url: `https://open.spotify.com/embed/track/${firstId}`,
			credentials: "omit",
		});
		const request = vi.mocked(fetch).mock.calls[1]?.[0];
		expect(request).toMatchObject({
			url: endpoint,
			method: "POST",
			credentials: "omit",
			headers: {
				Authorization: "Bearer anonymous-test-session",
				"Content-Type": "application/json",
				"Accept-Language": "en-US,en;q=0.9",
				"app-platform": "WebPlayer",
			},
		});
		expect(JSON.parse(request?.body ?? "")).toEqual({
			operationName: "queryTrackCreditsGroupedModal",
			variables: {
				trackUri: `spotify:track:${firstId}`,
				contributorsLimit: 100,
				contributorsOffset: 0,
			},
			extensions: {
				persistedQuery: {
					version: 1,
					sha256Hash:
						"f135fb9be58a72d041ab5d214d817021a272405d883860468e2627afb01a3ca9",
				},
			},
		});
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test("shares one in-flight anonymous session across concurrent songs, but not separate imports", async () => {
		const resolve = createSongCreditsResolver();
		await Promise.all([resolve(firstUrl), resolve(secondUrl)]);
		expect(
			vi
				.mocked(fetch)
				.mock.calls.filter(([request]) => request.url !== endpoint),
		).toHaveLength(1);
		expect(fetch).toHaveBeenCalledTimes(3);
		await createSongCreditsResolver()(firstUrl);
		expect(
			vi
				.mocked(fetch)
				.mock.calls.filter(([request]) => request.url !== endpoint),
		).toHaveLength(2);
	});

	test("refreshes an expired anonymous session before loading another song", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
		const resolve = createSongCreditsResolver();
		await resolve(firstUrl);
		vi.advanceTimersByTime(3_600_001);
		await resolve(secondUrl);
		expect(
			vi
				.mocked(fetch)
				.mock.calls.filter(([request]) => request.url !== endpoint),
		).toHaveLength(2);
	});

	test("collects every page, including a final empty page after an exact page-size result", async () => {
		const items = Array.from({ length: 100 }, (_, index) => ({
			name: `Writer ${index}`,
			role: "Composer",
		}));
		vi.mocked(fetch).mockImplementation(({ url, body }) => {
			if (url !== endpoint) return Promise.resolve(embed());
			const { contributorsOffset } = queryVariables(body);
			return Promise.resolve(
				creditsResponse(contributorsOffset === 0 ? items : []),
			);
		});
		const result = await createSongCreditsResolver()(firstUrl);
		expect(result).toHaveLength(100);
		expect(result[99]).toEqual({ name: "Writer 99", role: "composition" });
		expect(
			vi
				.mocked(fetch)
				.mock.calls.filter(([request]) => request.url === endpoint)
				.map(([request]) => queryVariables(request.body).contributorsOffset),
		).toEqual([0, 100]);
	});

	test("reports repeated full pages instead of fetching indefinitely", async () => {
		vi.mocked(fetch).mockImplementation(({ url }) =>
			Promise.resolve(
				url !== endpoint
					? embed()
					: creditsResponse(
							Array.from({ length: 100 }, () => ({
								name: "Writer",
								role: "Composer",
							})),
						),
			),
		);
		await expect(createSongCreditsResolver()(firstUrl)).rejects.toThrow(
			"pagination did not advance",
		);
		expect(fetch).toHaveBeenCalledTimes(3);
	});

	test("stops scheduling credits if a new import starts while the session loads", async () => {
		let active = true;
		vi.mocked(fetch).mockImplementation(() => {
			active = false;
			return Promise.resolve(embed());
		});
		await expect(
			createSongCreditsResolver(() => active)(firstUrl),
		).rejects.toThrow("cancelled");
		expect(fetch).toHaveBeenCalledOnce();
	});

	test("stops pagination after cancellation", async () => {
		let active = true;
		vi.mocked(fetch).mockImplementation(({ url }) => {
			if (url !== endpoint) return Promise.resolve(embed());
			active = false;
			return Promise.resolve(
				creditsResponse(
					Array.from({ length: 100 }, (_, index) => ({
						name: `Writer ${index}`,
						role: "Composer",
					})),
				),
			);
		});
		await expect(
			createSongCreditsResolver(() => active)(firstUrl),
		).rejects.toThrow("cancelled");
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test.each([
		"https://example.com/track/1234567890123456789012",
		"https://open.spotify.com.evil.example/track/1234567890123456789012",
		"http://open.spotify.com/track/1234567890123456789012",
		"https://open.spotify.com/album/1234567890123456789012",
		"https://open.spotify.com/track/short",
		"https://user:password@open.spotify.com/track/1234567890123456789012",
	])("rejects unsupported credit reference %s before making a request", async (url) => {
		await expect(createSongCreditsResolver()(url)).rejects.toThrow(
			"Unsupported",
		);
		expect(fetch).not.toHaveBeenCalled();
	});

	test.each([
		"<html>No session</html>",
		'<script id="__NEXT_DATA__">{invalid}</script>',
		'<script id="__NEXT_DATA__">{}</script>',
		embed("", Date.now() + 60_000),
		embed("expired-session", 0),
		embed("not-anonymous", Date.now() + 60_000, false),
	])("reports missing, invalid, expired or non-anonymous embed data", async (html) => {
		vi.mocked(fetch).mockResolvedValue(html);
		await expect(createSongCreditsResolver()(firstUrl)).rejects.toThrow();
		expect(fetch).toHaveBeenCalledOnce();
	});

	test.each([
		{ errors: [{ message: "PersistedQueryNotFound" }] },
		{ data: null },
		{ data: { trackUnion: { __typename: "NotFound" } } },
		{ data: { trackUnion: { __typename: "Track", name: "Example Track" } } },
	])("does not disguise query errors or missing credit data as empty credits", async (response) => {
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(embed())
			.mockResolvedValueOnce(JSON.stringify(response));
		await expect(createSongCreditsResolver()(firstUrl)).rejects.toThrow(
			/credits query failed|credits are unavailable/,
		);
	});

	test("accepts a valid empty contributor list but rejects malformed contributors", async () => {
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(embed())
			.mockResolvedValueOnce(creditsResponse([]));
		const resolve = createSongCreditsResolver();
		await expect(resolve(firstUrl)).resolves.toEqual([]);
		vi.mocked(fetch).mockResolvedValueOnce(
			creditsResponse([{ name: "", role: "Composer" }]),
		);
		await expect(resolve(secondUrl)).rejects.toThrow(
			"Invalid Spotify song credit",
		);
	});

	test("reports HTTP failures instead of returning successful empty metadata", async () => {
		vi.mocked(fetch)
			.mockReset()
			.mockResolvedValueOnce(embed())
			.mockRejectedValueOnce(new Error("HTTP 401"));
		await expect(createSongCreditsResolver()(firstUrl)).rejects.toThrow(
			"HTTP 401",
		);
	});

	test("groups the example's composers across the release and preserves separate lyricist scopes", async () => {
		const exampleContributors = (lyricist: string) => [
			{ name: "Release Artist", role: "Main Artist" },
			{ name: "William Jarboe", role: "Composer" },
			{ name: "Damian Anton-Ojeda", role: "Composer" },
			{ name: "Austyn Sullivan", role: "Composer" },
			{ name: lyricist, role: "Lyricist" },
		];
		vi.mocked(fetch).mockImplementation(({ url, body }) => {
			if (url !== endpoint) return Promise.resolve(embed());
			const id = queryVariables(body).trackUri.split(":").at(-1);
			return Promise.resolve(
				creditsResponse(
					exampleContributors(
						Number(id) % 2 ? "William Jarboe" : "Damian Anton-Ojeda",
					),
				),
			);
		});
		const onProgress = vi.fn();
		const result = await loadCreditSuggestions(
			[1, 2, 3, 4].map((position) => ({
				position: String(position),
				creditsUrl: `https://open.spotify.com/track/${String(position).padStart(22, "0")}`,
			})),
			{ isActive: () => true, onProgress },
		);
		expect(result.failedPositions).toEqual([]);
		expect(fetch).toHaveBeenCalledTimes(5);
		expect(onProgress).toHaveBeenLastCalledWith(4, 4);
		expect(getSuggestedCredits(result.tracks)).toMatchObject([
			{ name: "William Jarboe", role: "composition", positions: [] },
			{ name: "Damian Anton-Ojeda", role: "composition", positions: [] },
			{ name: "Austyn Sullivan", role: "composition", positions: [] },
			{ name: "William Jarboe", role: "lyrics", positions: ["1", "3"] },
			{ name: "Damian Anton-Ojeda", role: "lyrics", positions: ["2", "4"] },
		]);
	});
});
