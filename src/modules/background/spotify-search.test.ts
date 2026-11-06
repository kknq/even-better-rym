import { afterEach, beforeEach, expect, test, vi } from "vitest";
import browser from "webextension-polyfill";
import type { SearchResult } from "~/modules/spotify-search/messages";
import type { SpotifySearchRequest } from "~/shared/utils/messaging";
import { readHiddenPage } from "./hidden-page";
import { spotifySearch } from "./spotify-search";

vi.mock("./hidden-page", () => ({ readHiddenPage: vi.fn() }));
vi.mock("./spotify-network", () => ({
	spotifyNetworkDiagnostics: () => ({
		start: vi.fn(),
		diagnostic: () => ({
			stage: "network-requests",
			details: '{"started":true,"stopped":true,"outcomes":[],"pending":[]}',
		}),
	}),
}));
vi.mock("webextension-polyfill", () => ({
	default: {
		runtime: { getManifest: () => ({ manifest_version: 3 }) },
		storage: { local: { get: vi.fn(), set: vi.fn() } },
	},
}));

const request: SpotifySearchRequest = {
	id: "request",
	type: "spotifySearch",
	data: { artist: "Private artist", title: "Private search title" },
};
const pageDiagnostics = [
	{ stage: "page-reader-failed", details: '{"hasSpotifyError":true}' },
	{ stage: "frame-finished", details: '{"status":"error"}' },
	{ stage: "page-reader-failed", details: '{"hasReloadButton":true}' },
	{ stage: "frame-finished", details: '{"status":"error"}' },
];
const networkDiagnostic = {
	stage: "network-requests",
	details: '{"started":true,"stopped":true,"outcomes":[],"pending":[]}',
};
const diagnostics = [...pageDiagnostics, networkDiagnostic];
const failure: SearchResult = {
	status: "error",
	message: "Spotify search page failed to render",
	diagnostics: pageDiagnostics,
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
	vi.clearAllMocks();
	vi.mocked(readHiddenPage).mockReset().mockResolvedValue(failure);
	vi.mocked(browser.storage.local.get).mockReset().mockResolvedValue({});
	vi.mocked(browser.storage.local.set).mockReset().mockResolvedValue();
	vi.spyOn(console, "info").mockImplementation(() => undefined);
	vi.spyOn(console, "warn").mockImplementation(() => undefined);
	vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

test("forwards both attempts' diagnostics and persists failure metadata without search inputs", async () => {
	await expect(spotifySearch(request)).resolves.toEqual({
		id: request.id,
		type: request.type,
		data: { error: "Spotify search page failed to render", diagnostics },
	});
	expect(browser.storage.local.set).toHaveBeenCalledExactlyOnceWith({
		spotifySearchFailures: [
			{
				requestId: request.id,
				timestamp: "2026-01-01T00:00:00.000Z",
				manifestVersion: 3,
				status: "error",
				error: "Spotify search page failed to render",
				diagnostics,
			},
		],
	});
	expect(
		JSON.stringify(vi.mocked(browser.storage.local.set).mock.calls),
	).not.toContain("Private");
});

test("retains only the latest 20 failures", async () => {
	const history = Array.from({ length: 20 }, (_, id) => ({
		requestId: `${id}`,
	}));
	vi.mocked(browser.storage.local.get).mockResolvedValue({
		spotifySearchFailures: history,
	});
	await spotifySearch(request);
	expect(browser.storage.local.set).toHaveBeenCalledWith({
		spotifySearchFailures: [
			...history.slice(1),
			expect.objectContaining({ requestId: request.id }),
		],
	});
});

test("serializes concurrent history updates without losing failures", async () => {
	const stored: Record<string, unknown> = {};
	vi.mocked(browser.storage.local.get).mockImplementation(() =>
		Promise.resolve({ ...stored }),
	);
	vi.mocked(browser.storage.local.set).mockImplementation((items) => {
		Object.assign(stored, items);
		return Promise.resolve();
	});
	await Promise.all([
		spotifySearch(request),
		spotifySearch({ ...request, id: "second" }),
	]);
	expect(stored.spotifySearchFailures).toEqual([
		expect.objectContaining({ requestId: request.id }),
		expect.objectContaining({ requestId: "second" }),
	]);
});

test.each([
	"page-reader-failed",
	"page-runtime-errors",
])("keeps recovered %s diagnostics without changing the successful result", async (stage) => {
	const url = "https://open.spotify.com/album/3SRxE9NuyRHYLcmCTaCEL3";
	const recoveredDiagnostics = [{ ...diagnostics[0], stage }];
	vi.mocked(readHiddenPage).mockResolvedValue({
		status: "found",
		url,
		diagnostics: recoveredDiagnostics,
	});
	await expect(spotifySearch(request)).resolves.toHaveProperty("data", {
		url,
		diagnostics: recoveredDiagnostics,
	});
	expect(browser.storage.local.set).toHaveBeenCalledWith({
		spotifySearchFailures: [
			expect.objectContaining({
				status: "found",
				diagnostics: recoveredDiagnostics,
			}),
		],
	});
});

test.each([
	{ status: "not-found" },
	{
		status: "found",
		url: "https://open.spotify.com/album/3SRxE9NuyRHYLcmCTaCEL3",
	},
])("does not store ordinary successful searches: $status", async (result) => {
	vi.mocked(readHiddenPage).mockResolvedValue(result);
	await spotifySearch(request);
	expect(browser.storage.local.set).not.toHaveBeenCalled();
});

test("persists background failures and still returns the original error", async () => {
	vi.mocked(readHiddenPage).mockRejectedValue(
		new Error("Offscreen unavailable"),
	);
	await expect(spotifySearch(request)).resolves.toHaveProperty(
		"data.error",
		"Offscreen unavailable",
	);
	expect(browser.storage.local.set).toHaveBeenCalledWith({
		spotifySearchFailures: [
			expect.objectContaining({
				error: "Offscreen unavailable",
				diagnostics: [networkDiagnostic],
			}),
		],
	});
});

test("reports storage failures without replacing the search failure or blocking later writes", async () => {
	const error = new Error("Storage unavailable");
	vi.mocked(browser.storage.local.set).mockRejectedValueOnce(error);
	await expect(spotifySearch(request)).resolves.toHaveProperty(
		"data.error",
		"Spotify search page failed to render",
	);
	expect(console.error).toHaveBeenCalledWith(
		"[EvenBetterRYM Spotify] failed to save diagnostics",
		{ requestId: request.id, error },
	);
	await spotifySearch({ ...request, id: "second" });
	expect(browser.storage.local.set).toHaveBeenCalledTimes(2);
});
