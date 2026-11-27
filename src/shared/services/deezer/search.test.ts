import { beforeEach, expect, test, vi } from "vitest";

import { fetch } from "~/shared/utils/fetch";
import { search } from "./search";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));

beforeEach(() => vi.mocked(fetch).mockReset());

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
	vi.mocked(fetch).mockResolvedValueOnce(JSON.stringify({ data: [{ link }] }));
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
