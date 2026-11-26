import { beforeEach, expect, test, vi } from "vitest";

import { fetch } from "~/shared/utils/fetch";
import { search } from "./search";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));

beforeEach(() => vi.mocked(fetch).mockReset());

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
