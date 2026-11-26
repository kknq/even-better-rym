import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ReleaseIssue } from "~/shared/release-data";
import type { FetchRequest, FetchResponse } from "~/shared/utils/messaging";
import { createDiscogsSearch } from "./search";

vi.mock("~/shared/utils/messaging", () => ({
	sendBackgroundMessage: vi.fn(),
}));

const request = vi.fn<(data: FetchRequest["data"]) => Promise<FetchResponse>>();
const search = createDiscogsSearch(request);
const release = {
	artistName: "Sarah Davachi",
	albumTitle: "The Will of Tongues",
};
const issue: ReleaseIssue = {
	catalogNumber: "LMXIIICD",
	label: "Late",
	artist: release.artistName,
	title: release.albumTitle,
	format: "CD",
	country: "",
	year: 2026,
};
const candidate = {
	catno: "LMXIIICD",
	label: ["Late Music"],
	title: "Sarah Davachi - The Will Of Tongues",
	resource_url: "https://api.discogs.com/releases/38269599",
};
const respond = (body: unknown, status = 200) =>
	request.mockResolvedValueOnce({
		id: "request",
		type: "fetch",
		data: { body: JSON.stringify(body), status, statusText: "OK" },
	});

beforeEach(() => vi.resetAllMocks());

test("finds the Sokrovishche CD without a RYM catalogue number", async () => {
	respond({
		results: [
			{
				title: "Аукцыон - Сокровище",
				catno: "U-43",
				label: ["Ulitka Records"],
				year: "2025",
				format: ["CD", "Album"],
				resource_url: "https://api.discogs.com/releases/35915692",
			},
		],
	});
	const images = [{ type: "primary", uri: "https://example.com/cover.jpg" }];
	respond({ images });
	await expect(
		search.findRelease({
			catalogNumber: "",
			label: "Улитка",
			artist: "АукцЫон",
			title: "Сокровище",
			format: "CD ",
			year: 2025,
			country: "",
		}),
	).resolves.toEqual({ images });
	const query = new URL(request.mock.calls[0][0].url).searchParams;
	expect(query.has("catno")).toBe(false);
	expect(query.get("artist")).toBe("АукцЫон");
});

test("loads Oxxxymiron images using the full catalogue number and Unicode-equivalent title", async () => {
	respond({
		results: [
			{
				catno: "МДС-CD 047/11",
				label: ["NMDC", "Vagabund"],
				title: "Oxxxymiron - Вечныи\u0306 Жид",
				resource_url: "https://api.discogs.com/releases/3764853",
			},
		],
	});
	const images = [
		{ type: "secondary", uri: "https://example.com/oxxxymiron.jpg" },
	];
	respond({ images });
	await expect(
		search.findRelease({
			catalogNumber: "МДС-CD 047/11",
			label: "NMDC",
			artist: "Oxxxymiron",
			title: "Вечный жид",
			format: "CD",
			country: "",
			year: 2011,
		}),
	).resolves.toEqual({ images });
	expect(new URL(request.mock.calls[0][0].url).searchParams.get("catno")).toBe(
		"МДС-CD 047/11",
	);
});

test("falls back from a localized Discogs title to the original title", async () => {
	respond({ results: [] });
	respond({ results: [{ id: 12, title: "Oxxxymiron - Вечный Жид" }] });
	await expect(
		search.findDestination({
			artistName: "Oxxxymiron",
			albumTitle: "Vechny zhid",
			nativeAlbumTitle: "Вечный жид",
		}),
	).resolves.toBe("https://www.discogs.com/master/12");
	expect(
		new URL(request.mock.calls[1][0].url).searchParams.get("release_title"),
	).toBe("Вечный жид");
});

describe("Discogs search", () => {
	test("opens the selected issue without fetching details or searching masters", async () => {
		respond({ results: [candidate] });
		await expect(search.findDestination(release, issue)).resolves.toBe(
			"https://www.discogs.com/release/38269599",
		);
		expect(request).toHaveBeenCalledTimes(1);
		const query = new URL(request.mock.calls[0][0].url).searchParams;
		expect(query.get("catno")).toBe("LMXIIICD");
		expect(query.get("type")).toBe("release");
	});

	test("searches masters by artist and title without catalogue metadata", async () => {
		respond({
			results: [
				{ id: 1, title: "Another Artist - The Will Of Tongues" },
				{ id: 4328466, title: candidate.title },
			],
		});
		await expect(search.findDestination(release)).resolves.toBe(
			"https://www.discogs.com/master/4328466",
		);
		const query = new URL(request.mock.calls[0][0].url).searchParams;
		expect(query.get("artist")).toBe(release.artistName);
		expect(query.get("release_title")).toBe(release.albumTitle);
		expect(query.get("type")).toBe("master");
	});

	test("falls back to master search when the catalogue search has no match", async () => {
		respond({ results: [{ ...candidate, catno: "OTHER" }] });
		respond({ results: [{ id: 4328466, title: candidate.title }] });
		await expect(search.findDestination(release, issue)).resolves.toBe(
			"https://www.discogs.com/master/4328466",
		);
		expect(request).toHaveBeenCalledTimes(2);
	});

	test("falls back to master search when the issue result has no valid release URL", async () => {
		respond({ results: [{ ...candidate, resource_url: undefined }] });
		respond({ results: [{ id: 4328466, title: candidate.title }] });
		await expect(search.findDestination(release, issue)).resolves.toBe(
			"https://www.discogs.com/master/4328466",
		);
		expect(request).toHaveBeenCalledTimes(2);
	});

	test.each(
		[
			[],
			[{ id: 1, title: "Different Artist - Different Album" }],
			[{ id: 1, title: "Sarah Davachi - The Will Of Tongues Live" }],
			[{ id: 1, title: "Sarah Davachi Ensemble - The Will Of Tongues" }],
			[{ title: candidate.title }],
		].map((results) => ({ results })),
	)("does not return an unrelated or invalid master: $results", async ({
		results,
	}) => {
		respond({ results });
		await expect(search.findDestination(release)).resolves.toBeUndefined();
	});

	test("matches non-Latin artist and album names", async () => {
		respond({ results: [{ id: 12, title: "坂本龍一 - 音楽図鑑" }] });
		await expect(
			search.findDestination({
				artistName: "坂本龍一",
				albumTitle: "音楽図鑑",
			}),
		).resolves.toBe("https://www.discogs.com/master/12");
	});

	test("ignores Discogs artist disambiguation numbers", async () => {
		respond({
			results: [
				{ id: 4328466, title: "Sarah Davachi (2) - The Will Of Tongues" },
			],
		});
		await expect(search.findDestination(release)).resolves.toBe(
			"https://www.discogs.com/master/4328466",
		);
	});

	test("preserves secondary images for the carousel", async () => {
		respond({ results: [candidate] });
		const details = {
			images: [{ type: "secondary", uri: "https://example.com/image.jpg" }],
		};
		respond(details);
		await expect(search.findRelease(issue)).resolves.toEqual(details);
	});

	test("narrows reused catalogue numbers by artist and title to find Marschak images", async () => {
		respond({
			results: [
				{
					catno: "hs007",
					label: ["Homo Sentimentalis Recordings"],
					title: "Marschak - Marschak",
					resource_url: "https://api.discogs.com/releases/15501675",
				},
				{
					catno: "hs007",
					label: ["Homo Sentimentalis Recordings"],
					title: "Marschak - Marschak",
					resource_url: "https://api.discogs.com/releases/2355359",
				},
			],
		});
		const images = Array.from({ length: 9 }, (_, index) => ({
			type: "secondary",
			uri: `https://example.com/marschak-${index}.jpg`,
		}));
		respond({ images });
		await expect(
			search.findRelease({
				catalogNumber: "hs007",
				label: "Homo Sentimentalis",
				artist: "Marschak",
				title: "Marschak",
				format: "CD ",
				country: "Russian Federation",
				year: 2003,
			}),
		).resolves.toEqual({ images });
		const query = new URL(request.mock.calls[0][0].url).searchParams;
		expect(query.get("catno")).toBe("hs007");
		expect(query.get("artist")).toBe("Marschak");
		expect(query.get("release_title")).toBe("Marschak");
		expect(request.mock.calls[1][0].url).toBe(
			"https://api.discogs.com/releases/15501675",
		);
	});

	test.each([429, 500])("surfaces HTTP %s errors", async (status) => {
		respond({}, status);
		await expect(search.findDestination(release)).rejects.toThrow(
			status === 429 ? "Discogs rate limit" : "Discogs request failed",
		);
	});

	test("surfaces transport errors", async () => {
		request.mockRejectedValueOnce(new Error("offline"));
		await expect(search.findDestination(release)).rejects.toThrow("offline");
	});
});
