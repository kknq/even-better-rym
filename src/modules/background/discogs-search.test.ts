import { beforeEach, expect, test, vi } from "vitest";
import browser from "webextension-polyfill";
import { discogsSearch } from "./discogs-search";
import { backgroundFetch } from "./fetch";

vi.mock("webextension-polyfill", () => ({
	default: { tabs: { create: vi.fn() } },
}));
vi.mock("./fetch", () => ({ backgroundFetch: vi.fn() }));

const request = {
	id: "request",
	type: "discogsSearch",
	data: {
		release: {
			artistName: "Sarah Davachi",
			albumTitle: "The Will of Tongues",
		},
	},
} as const;

beforeEach(() => vi.resetAllMocks());

test("opens the matching issue instead of its master", async () => {
	vi.mocked(backgroundFetch).mockResolvedValue({
		id: request.id,
		type: "fetch",
		data: {
			status: 200,
			statusText: "OK",
			body: JSON.stringify({
				results: [
					{
						catno: "LMXIIICD",
						label: ["Late Music"],
						title: "Sarah Davachi - The Will Of Tongues",
						resource_url: "https://api.discogs.com/releases/38269599",
					},
				],
			}),
		},
	});
	await expect(
		discogsSearch({
			...request,
			data: {
				...request.data,
				issue: {
					catalogNumber: "LMXIIICD",
					label: "Late",
					artist: "Sarah Davachi",
					title: "The Will of Tongues",
					format: "CD",
					country: "",
					year: 2026,
				},
			},
		}),
	).resolves.toHaveProperty(
		"data.url",
		"https://www.discogs.com/release/38269599",
	);
	expect(browser.tabs.create).toHaveBeenCalledExactlyOnceWith({
		url: "https://www.discogs.com/release/38269599",
	});
	expect(backgroundFetch).toHaveBeenCalledTimes(1);
});

test("opens only the matching master in a new tab", async () => {
	vi.mocked(backgroundFetch).mockResolvedValue({
		id: request.id,
		type: "fetch",
		data: {
			status: 200,
			statusText: "OK",
			body: JSON.stringify({
				results: [
					{ id: 4328466, title: "Sarah Davachi - The Will Of Tongues" },
				],
			}),
		},
	});
	await expect(discogsSearch(request)).resolves.toEqual({
		id: request.id,
		type: "discogsSearch",
		data: { url: "https://www.discogs.com/master/4328466" },
	});
	expect(browser.tabs.create).toHaveBeenCalledExactlyOnceWith({
		url: "https://www.discogs.com/master/4328466",
	});
});

test("does not open a tab when no matching master exists", async () => {
	vi.mocked(backgroundFetch).mockResolvedValue({
		id: request.id,
		type: "fetch",
		data: { status: 200, statusText: "OK", body: '{"results":[]}' },
	});
	await expect(discogsSearch(request)).resolves.toHaveProperty(
		"data.url",
		undefined,
	);
	expect(browser.tabs.create).not.toHaveBeenCalled();
});

test("returns errors to the button without opening a tab", async () => {
	vi.mocked(backgroundFetch).mockRejectedValue(new Error("offline"));
	await expect(discogsSearch(request)).resolves.toHaveProperty(
		"data.error",
		"offline",
	);
	expect(browser.tabs.create).not.toHaveBeenCalled();
});
