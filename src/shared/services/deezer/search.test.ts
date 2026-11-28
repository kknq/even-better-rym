import { beforeEach, expect, test, vi } from "vitest";

import { fetch } from "~/shared/utils/fetch";
import { search } from "./search";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));

beforeEach(() => vi.mocked(fetch).mockReset());

test.each([
	false,
	true,
])("selects Saturday Night rather than its maxi single (standard=%s)", async (standard) => {
	vi.mocked(fetch).mockResolvedValueOnce(
		JSON.stringify({
			data: [
				{
					title: "Get Down Saturday Night - Maxi Single",
					artist: { name: "Oliver Cheatham" },
					link: "https://www.deezer.com/album/7316000",
				},
				{
					title: "Saturday Night (Expanded Edition)",
					artist: { name: "Oliver Cheatham" },
					link: "https://www.deezer.com/album/361793167",
				},
				...(standard
					? [
							{
								title: "Saturday Night",
								artist: { name: "Oliver Cheatham" },
								link: "https://www.deezer.com/album/1",
							},
						]
					: []),
			],
		}),
	);
	await expect(
		search({ artist: "Oliver Cheatham", title: "Saturday Night" }),
	).resolves.toBe(
		`https://www.deezer.com/album/${standard ? "1" : "361793167"}`,
	);
});

test("rejects wrong artist and title in every Deezer search path", async () => {
	vi.mocked(fetch).mockResolvedValue(
		JSON.stringify({
			data: [
				{
					title: "Saturday Night (Expanded Edition)",
					artist: { name: "Another Artist" },
					link: "https://www.deezer.com/album/1",
				},
				{
					title: "Get Down Saturday Night - Maxi Single",
					artist: { name: "Oliver Cheatham" },
					link: "https://www.deezer.com/album/2",
				},
			],
			total: 1,
		}),
	);
	await expect(
		search({ artist: "Oliver Cheatham", title: "Saturday Night" }),
	).resolves.toBeUndefined();
});

test("retries GTA V's volume spelling and accepts localized Various Artists credits", async () => {
	const title = "The Music of Grand Theft Auto V: Volume 1 - Original Music";
	vi.mocked(fetch)
		.mockResolvedValueOnce('{"data":[]}')
		.mockResolvedValueOnce('{"data":[]}')
		.mockResolvedValueOnce(
			JSON.stringify({
				data: [
					{
						title: "The Music of Grand Theft Auto V, Vol. 2: The Score",
						artist: { name: "Różni wykonawcy" },
						link: "https://www.deezer.com/album/2",
					},
					{
						title: "The Music of Grand Theft Auto V, Vol. 1: Original Music",
						artist: { name: "Różni wykonawcy" },
						link: "https://www.deezer.com/album/377010107",
					},
				],
			}),
		);
	await expect(
		search({
			artist: "Various Artists",
			title,
			serviceRegions: { deezer: "PL" },
		}),
	).resolves.toBe("https://www.deezer.com/pl/album/377010107");
	expect(vi.mocked(fetch).mock.calls[2][0].urlParameters?.q).toBe(
		'"Various Artists" "The Music of Grand Theft Auto V, Vol. 1: Original Music"',
	);
});

test("keeps artist validation for named artists in volume retries", async () => {
	vi.mocked(fetch).mockResolvedValue(
		JSON.stringify({
			data: [
				{
					title: "Album Vol. 1",
					artist: { name: "Another Artist" },
					link: "https://www.deezer.com/album/1",
				},
			],
			total: 2,
		}),
	);
	vi.mocked(fetch).mockResolvedValueOnce('{"data":[]}');
	await expect(
		search({ artist: "Artist", title: "Album Volume 1" }),
	).resolves.toBeUndefined();
});

test.each(
	(["combined", "catalog", "localized"] as const).flatMap((path) =>
		[
			"https://www.deezer.com/album/1070047012",
			"https://www.deezer.com/ru/album/1070047012",
			"https://www.deezer.com/en-us/album/1070047012",
		].flatMap((link) => ["PL", "pl"].map((region) => ({ path, link, region }))),
	),
)("uses $region for the $path result $link", async ({ path, link, region }) => {
	if (path !== "combined") {
		vi.mocked(fetch).mockResolvedValueOnce('{"data":[]}');
	}
	if (path === "localized") {
		vi.mocked(fetch).mockResolvedValueOnce('{"data":[]}');
	}
	vi.mocked(fetch).mockResolvedValueOnce(
		JSON.stringify({
			data: [
				{
					link: `${link}?source=search#tracks`,
					title: "Separate Ways",
					artist: { name: "MJ Lenderman" },
				},
			],
			total: 1,
		}),
	);
	await expect(
		search({
			artist: "MJ Lenderman",
			title: "Separate Ways",
			serviceRegions: { deezer: region },
		}),
	).resolves.toBe(
		"https://www.deezer.com/pl/album/1070047012?source=search#tracks",
	);
});

test.each([
	"https://www.deezer.com/album/1070047012",
	"https://www.deezer.com/ru/album/1070047012",
])("preserves the API URL without a preferred region: %s", async (link) => {
	vi.mocked(fetch).mockResolvedValueOnce(
		JSON.stringify({
			data: [
				{
					link,
					title: "Separate Ways",
					artist: { name: "MJ Lenderman" },
				},
			],
		}),
	);
	await expect(
		search({
			artist: "MJ Lenderman",
			title: "Separate Ways",
			serviceRegions: {},
		}),
	).resolves.toBe(link);
});

test.each([
	["Svartidauði", "Svartidaudi", undefined],
	["Misthyrming", "Misþyrming", undefined],
	["7Б", "7B", "7B"],
])("matches artist spellings in the artist catalog: %s / %s", async (artist, candidate, artistAlias) => {
	const link = "https://www.deezer.com/album/1";
	vi.mocked(fetch)
		.mockResolvedValueOnce('{"data":[]}')
		.mockResolvedValueOnce(
			JSON.stringify({
				data: [{ link, title: "Album", artist: { name: candidate } }],
			}),
		);
	await expect(search({ artist, artistAlias, title: "Album" })).resolves.toBe(
		link,
	);
});

test("still rejects a different album title", async () => {
	vi.mocked(fetch)
		.mockResolvedValueOnce('{"data":[]}')
		.mockResolvedValueOnce(
			JSON.stringify({
				data: [
					{
						link: "https://www.deezer.com/album/1",
						title: "Album Live",
						artist: { name: "Svartidaudi" },
					},
				],
			}),
		)
		.mockResolvedValueOnce('{"data":[],"total":0}');
	await expect(
		search({ artist: "Svartidauði", title: "Album" }),
	).resolves.toBeUndefined();
});
