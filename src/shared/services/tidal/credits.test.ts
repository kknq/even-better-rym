import { beforeEach, expect, test, vi } from "vitest";
import { sendBackgroundMessage } from "~/shared/utils/messaging";
import { createSongCreditsResolver } from "./credits";

vi.mock("~/shared/utils/messaging", () => ({
	sendBackgroundMessage: vi.fn(),
}));

const first = "https://tidal.com/album/123/track/101";
const second = "https://tidal.com/album/123/track/102";
const tracks = [{ creditsUrl: first }, { creditsUrl: second }];
beforeEach(() => {
	vi.mocked(sendBackgroundMessage)
		.mockReset()
		.mockResolvedValue({
			id: "request",
			type: "tidalCredits",
			data: {
				tracks: [
					{
						id: "102",
						credits: [{ name: "Guest", role: "Featured Artist" }],
					},
					{
						id: "101",
						credits: [
							{ name: "Carti", role: "RapVocalist" },
							{ name: "Writer", role: "Composer" },
							{ name: "Engineer", role: "Mixing Engineer" },
							{ name: "Person", role: "Unusual_Instrument" },
						],
					},
				],
			},
		});
});

test("shares one rendered album read across concurrent songs, matching by ID and normalizing shared roles", async () => {
	const resolve = createSongCreditsResolver(() => true, tracks);
	expect(await Promise.all([resolve(first), resolve(second)])).toEqual([
		[
			{ name: "Carti", role: "rap" },
			{ name: "Writer", role: "composer" },
			{ name: "Engineer", role: "mixing engineer" },
			{ name: "Person", role: "unusual instrument" },
		],
		[{ name: "Guest", role: "featured" }],
	]);
	expect(sendBackgroundMessage).toHaveBeenCalledExactlyOnceWith({
		type: "tidalCredits",
		data: { albumId: "123", trackIds: ["101", "102"] },
	});
});

test("keeps album reads scoped to an import and excludes headers and other services", async () => {
	const source = [
		...tracks,
		{ creditsUrl: "https://music.apple.com/song/1" },
		{ creditsUrl: "https://tidal.com/album/123/track/103", header: true },
	];
	await createSongCreditsResolver(() => true, source)(first);
	await createSongCreditsResolver(() => true, source)(first);
	expect(sendBackgroundMessage).toHaveBeenCalledTimes(2);
	expect(sendBackgroundMessage).toHaveBeenLastCalledWith({
		type: "tidalCredits",
		data: { albumId: "123", trackIds: ["101", "102"] },
	});
});

test("deduplicates case-only source credits against known track-artist spelling without merging legal-name aliases", async () => {
	vi.mocked(sendBackgroundMessage).mockResolvedValue({
		id: "request",
		type: "tidalCredits",
		data: {
			tracks: [
				{
					id: "101",
					credits: [
						{ name: "FUTURE", role: "Featured Artist" },
						{ name: "Future", role: "Featured Artist" },
						{ name: "Nayvadius Wilburn", role: "Composer" },
					],
				},
			],
		},
	});
	await expect(
		createSongCreditsResolver(
			() => true,
			[{ creditsUrl: first, artists: ["Playboi Carti", "Future"] }],
		)(first),
	).resolves.toEqual([
		{ name: "Future", role: "featured" },
		{ name: "Nayvadius Wilburn", role: "composer" },
	]);
});

test.each([
	"http://tidal.com/album/123/track/101",
	"https://tidal.com.evil.example/album/123/track/101",
	"https://name@tidal.com/album/123/track/101",
	"https://tidal.com:444/album/123/track/101",
	"https://tidal.com/album/123",
	"https://tidal.com/album/123/track/101abc",
])("rejects unsupported credit reference before opening a page: %s", async (url) => {
	await expect(
		createSongCreditsResolver(() => true, tracks)(url),
	).rejects.toThrow("Unsupported Tidal");
	expect(sendBackgroundMessage).not.toHaveBeenCalled();
});

test("stops scheduling new album reads after cancellation", async () => {
	await expect(
		createSongCreditsResolver(() => false, tracks)(first),
	).rejects.toThrow("cancelled");
	expect(sendBackgroundMessage).not.toHaveBeenCalled();
});

test("propagates rendered-page errors and caches the failure for other tracks on the album", async () => {
	vi.mocked(sendBackgroundMessage).mockResolvedValue({
		id: "request",
		type: "tidalCredits",
		data: { error: "Tidal credits page did not load" },
	});
	const resolve = createSongCreditsResolver(() => true, tracks);
	await expect(resolve(first)).rejects.toThrow("did not load");
	await expect(resolve(second)).rejects.toThrow("did not load");
	expect(sendBackgroundMessage).toHaveBeenCalledOnce();
});

test("does not mistake a missing requested track for genuinely empty credits", async () => {
	vi.mocked(sendBackgroundMessage).mockResolvedValue({
		id: "request",
		type: "tidalCredits",
		data: { tracks: [{ id: "102", credits: [] }] },
	});
	await expect(
		createSongCreditsResolver(() => true, tracks)(first),
	).rejects.toThrow("Missing Tidal credits");
	await expect(
		createSongCreditsResolver(() => true, tracks)(second),
	).resolves.toEqual([]);
});
