import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { sendBackgroundMessage } from "~/shared/utils/messaging";
import { withArtistAlias } from "../search-matching";
import { search } from "./search";

vi.mock("~/shared/utils/messaging", () => ({
	sendBackgroundMessage: vi.fn(),
}));

const diagnostics = [
	{ stage: "page-reader-failed", details: '{"hasSpotifyError":true}' },
	{ stage: "frame-finished", details: '{"status":"error"}' },
];
const metadata = { artist: "Artist", title: "Album" };

test("passes RYM's artist alias to the background search", async () => {
	vi.mocked(sendBackgroundMessage).mockResolvedValue({
		id: "request",
		type: "spotifySearch",
		data: {},
	});
	await search({ artist: "7Б", artistAlias: "7B", title: "Рок Жив!" });
	expect(sendBackgroundMessage).toHaveBeenCalledWith({
		type: "spotifySearch",
		data: { artist: "7Б", artistAlias: "7B", title: "Рок Жив!" },
	});
});

test("uses the shared retry for an alternate artist name", async () => {
	const url = "https://open.spotify.com/album/3HYnc1NZK0U8K5uJU7d1uf";
	vi.mocked(sendBackgroundMessage)
		.mockResolvedValueOnce({ id: "original", type: "spotifySearch", data: {} })
		.mockResolvedValueOnce({
			id: "alias",
			type: "spotifySearch",
			data: { url },
		});
	await expect(
		withArtistAlias(search)({
			artist: "7Б",
			artistAlias: "7B",
			title: "Солнцу решать",
		}),
	).resolves.toBe(url);
	expect(sendBackgroundMessage).toHaveBeenNthCalledWith(2, {
		type: "spotifySearch",
		data: { artist: "7B", artistAlias: "7Б", title: "Солнцу решать" },
	});
});

beforeEach(() => {
	vi.mocked(sendBackgroundMessage).mockReset();
	vi.spyOn(console, "warn").mockImplementation(() => undefined);
	vi.spyOn(console, "info").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

test("logs the request ID and diagnostics in the calling page before throwing", async () => {
	const data = { error: "Spotify search page failed to render", diagnostics };
	vi.mocked(sendBackgroundMessage).mockResolvedValue({
		id: "request",
		type: "spotifySearch",
		data,
	});
	await expect(search(metadata)).rejects.toThrow(data.error);
	expect(console.warn).toHaveBeenCalledExactlyOnceWith(
		"[EvenBetterRYM Spotify] search diagnostics",
		{ requestId: "request", status: "error", ...data },
	);
});

test("logs failures even when page diagnostics are unavailable", async () => {
	vi.mocked(sendBackgroundMessage).mockResolvedValue({
		id: "request",
		type: "spotifySearch",
		data: { error: "Offscreen unavailable" },
	});
	await expect(search(metadata)).rejects.toThrow("Offscreen unavailable");
	expect(console.warn).toHaveBeenCalledWith(
		"[EvenBetterRYM Spotify] search diagnostics",
		{ requestId: "request", status: "error", error: "Offscreen unavailable" },
	);
});

test.each([
	"page-reader-failed",
	"page-runtime-errors",
])("logs recovered %s diagnostics while returning the matched URL", async (stage) => {
	const url = "https://open.spotify.com/album/3SRxE9NuyRHYLcmCTaCEL3";
	const recoveredDiagnostics = [{ ...diagnostics[0], stage }];
	vi.mocked(sendBackgroundMessage).mockResolvedValue({
		id: "request",
		type: "spotifySearch",
		data: { url, diagnostics: recoveredDiagnostics },
	});
	await expect(search(metadata)).resolves.toBe(url);
	expect(console.info).toHaveBeenCalledWith(
		"[EvenBetterRYM Spotify] search diagnostics",
		{
			requestId: "request",
			status: "found",
			url,
			diagnostics: recoveredDiagnostics,
		},
	);
	expect(console.warn).not.toHaveBeenCalled();
});

test("logs an incidental opaque script error as info when no matching album is expected", async () => {
	const runtimeDiagnostics = [
		{
			stage: "page-runtime-errors",
			details:
				'{"available":true,"errors":[{"kind":"error","name":"Error","message":"Script error.","stack":"","source":"","line":0,"column":0}]}',
		},
		{ stage: "frame-finished", details: '{"status":"not-found"}' },
	];
	vi.mocked(sendBackgroundMessage).mockResolvedValue({
		id: "request",
		type: "spotifySearch",
		data: { diagnostics: runtimeDiagnostics },
	});
	await expect(search(metadata)).resolves.toBeUndefined();
	expect(console.warn).not.toHaveBeenCalled();
	expect(console.info).toHaveBeenCalledExactlyOnceWith(
		"[EvenBetterRYM Spotify] search diagnostics",
		{
			requestId: "request",
			status: "not-found",
			diagnostics: runtimeDiagnostics,
		},
	);
});

test.each([
	{},
	{ url: "https://open.spotify.com/album/3SRxE9NuyRHYLcmCTaCEL3" },
	{
		diagnostics: [
			{ stage: "frame-finished", details: '{"status":"not-found"}' },
		],
	},
])("preserves ordinary outcomes without warning: %j", async (data) => {
	vi.mocked(sendBackgroundMessage).mockResolvedValue({
		id: "request",
		type: "spotifySearch",
		data,
	});
	await expect(search(metadata)).resolves.toBe(
		"url" in data ? data.url : undefined,
	);
	expect(console.warn).not.toHaveBeenCalled();
	expect(console.info).not.toHaveBeenCalled();
});
