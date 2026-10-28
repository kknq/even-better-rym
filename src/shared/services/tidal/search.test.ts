import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetch } from "~/shared/utils/fetch";
import { requestToken } from "./auth";
import { search } from "./search";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));
vi.mock("./auth", () => ({ requestToken: vi.fn() }));

describe("Tidal search", () => {
	beforeEach(() => {
		vi.mocked(fetch).mockReset();
		vi.mocked(requestToken).mockReset().mockResolvedValue({
			access_token: "test-token",
			expires_in: 3600,
			token_type: "Bearer",
		});
	});

	test("uses the query endpoint and reads albums from the result collection", async () => {
		vi.mocked(fetch).mockResolvedValue(
			JSON.stringify({
				data: [
					{
						relationships: {
							albums: { data: [{ id: "123" }, { id: "456" }] },
						},
					},
				],
			}),
		);

		await expect(
			search({
				artist: "Björk & friends",
				title: "A/B",
				serviceRegions: { tidal: "GB" },
			}),
		).resolves.toBe("https://tidal.com/browse/album/123");
		expect(fetch).toHaveBeenCalledWith({
			url: "https://openapi.tidal.com/v2/searchResults",
			method: "GET",
			headers: {
				Authorization: "Bearer test-token",
				Accept: "application/vnd.api+json",
				"Content-Type": "application/vnd.api+json",
			},
			urlParameters: {
				"filter[query]": "Björk & friends A/B",
				explicitFilter: "INCLUDE",
				countryCode: "GB",
				include: "albums",
			},
		});
	});

	test("defaults to the US region", async () => {
		vi.mocked(fetch).mockResolvedValue('{"data":[]}');

		await search({ artist: "Artist", title: "Album" });

		expect(vi.mocked(fetch).mock.calls[0]?.[0].urlParameters?.countryCode).toBe(
			"US",
		);
	});

	test.each([
		"",
		"{}",
		'{"data":[]}',
		'{"data":[{}]}',
		'{"data":[{"relationships":{"albums":{"data":[]}}}]}',
	])("returns no match for an empty result: %s", async (response) => {
		vi.mocked(fetch).mockResolvedValue(response);

		await expect(
			search({ artist: "Artist", title: "Album" }),
		).resolves.toBeUndefined();
	});

	test("propagates HTTP errors rather than reporting no match", async () => {
		vi.mocked(fetch).mockRejectedValue(new Error("HTTP 429"));

		await expect(search({ artist: "Artist", title: "Album" })).rejects.toThrow(
			"HTTP 429",
		);
	});
});
