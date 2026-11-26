import { beforeEach, expect, test, vi } from "vitest";
import browser from "webextension-polyfill";
import { backgroundFetch } from "./fetch";
import { wikipediaSearch } from "./wikipedia-search";

vi.mock("webextension-polyfill", () => ({
	default: { tabs: { create: vi.fn() } },
}));
vi.mock("./fetch", () => ({ backgroundFetch: vi.fn() }));

const request = {
	id: "request",
	type: "wikipediaSearch",
	data: { artistName: "Example Artist", albumTitle: "Example Album" },
} as const;
const entity = {
	labels: { en: { value: "Example Album" } },
	claims: {
		P175: [{ mainsnak: { datavalue: { value: { id: "Q2" } } } }],
	},
	sitelinks: {
		dewiki: {
			title: "Example Album",
			url: "https://de.wikipedia.org/wiki/Example_Album",
		},
	},
};
const respond = (body: unknown, status = 200) =>
	vi.mocked(backgroundFetch).mockResolvedValueOnce({
		id: request.id,
		type: "fetch",
		data: { status, statusText: "OK", body: JSON.stringify(body) },
	});
const fallback = (album = entity, artistName = "Example Artist") => {
	respond({ query: { search: [] } });
	respond({ query: { search: [{ title: "Q1" }] } });
	respond({ entities: { Q1: album } });
	respond({ entities: { Q2: { labels: { en: { value: artistName } } } } });
};

beforeEach(() => vi.resetAllMocks());

test.each([
	{ artistName: "7B", nativeArtistName: "7Б", albumTitle: "Олимпия" },
	{ artistName: "7Б", albumTitle: "Олимпия" },
	{ artistName: "7Б", albumTitle: "Olympia", nativeAlbumTitle: "Олимпия" },
])("finds Олимпия with missing localized names: %j", async (data) => {
	respond({ query: { search: [] } });
	respond({ query: { search: [{ title: "Q16682928" }] } });
	respond({
		entities: {
			Q16682928: {
				labels: { ru: { value: "Олимпия" } },
				claims: {
					P175: [{ mainsnak: { datavalue: { value: { id: "Q269954" } } } }],
				},
				sitelinks: {
					ruwiki: {
						title: "Олимпия (альбом)",
						url: "https://ru.wikipedia.org/wiki/Олимпия_(альбом)",
					},
				},
			},
		},
	});
	respond({ entities: { Q269954: { labels: { ru: { value: "7Б" } } } } });
	await expect(wikipediaSearch({ ...request, data })).resolves.toHaveProperty(
		"data.url",
		new URL("https://ru.wikipedia.org/wiki/Олимпия_(альбом)").href,
	);
	expect(
		vi.mocked(backgroundFetch).mock.calls[1][0].data.urlParameters?.srsearch,
	).toBe("Олимпия haswbstatement:P175");
});

test("finds Сокровище using native names, result 31 and a disambiguated Wikidata label", async () => {
	respond({ query: { search: [] } });
	respond({
		query: {
			search: [
				...Array.from({ length: 30 }, (_, index) => ({
					title: `Q${index + 1}`,
				})),
				{ title: "Q138774435" },
			],
		},
	});
	respond({
		entities: {
			Q138774435: {
				labels: { ru: { value: "Сокровище (альбом)" } },
				claims: {
					P175: [{ mainsnak: { datavalue: { value: { id: "Q771296" } } } }],
				},
				sitelinks: {
					ruwiki: {
						title: "Сокровище (альбом)",
						url: "https://ru.wikipedia.org/wiki/Сокровище_(альбом)",
					},
				},
			},
		},
	});
	respond({
		entities: {
			Q771296: { labels: { ru: { value: "АукцЫон" } } },
		},
	});
	await expect(
		wikipediaSearch({
			...request,
			data: {
				albumTitle: "Sokrovishe",
				artistName: "Auction",
				nativeAlbumTitle: "Сокровище",
				nativeArtistName: "АукцЫон",
			},
		}),
	).resolves.toHaveProperty(
		"data.url",
		new URL("https://ru.wikipedia.org/wiki/Сокровище_(альбом)").href,
	);
	expect(
		vi.mocked(backgroundFetch).mock.calls[1][0].data.urlParameters,
	).toMatchObject({
		srsearch: "Сокровище haswbstatement:P175",
		srlimit: "50",
	});
	expect(
		vi.mocked(backgroundFetch).mock.calls[0][0].data.urlParameters?.srsearch,
	).toContain('"Sokrovishe" "Auction"');
});

test("opens English first without requesting Wikidata", async () => {
	respond({ query: { search: [{ title: "Example Album (album)" }] } });
	await expect(wikipediaSearch(request)).resolves.toHaveProperty(
		"data.url",
		"https://en.wikipedia.org/wiki/Example_Album_(album)",
	);
	expect(backgroundFetch).toHaveBeenCalledTimes(1);
	expect(browser.tabs.create).toHaveBeenCalledExactlyOnceWith({
		url: "https://en.wikipedia.org/wiki/Example_Album_(album)",
	});
});

test("opens another language when English has no matching article", async () => {
	fallback();
	await expect(wikipediaSearch(request)).resolves.toHaveProperty(
		"data.url",
		"https://de.wikipedia.org/wiki/Example_Album",
	);
	expect(browser.tabs.create).toHaveBeenCalledExactlyOnceWith({
		url: "https://de.wikipedia.org/wiki/Example_Album",
	});
	expect(vi.mocked(backgroundFetch).mock.calls[1][0].data).toMatchObject({
		url: "https://www.wikidata.org/w/api.php",
		urlParameters: {
			action: "query",
			srsearch: "Example Album haswbstatement:P175",
		},
	});
});

test("does not open a different artist's release with the same title", async () => {
	fallback(entity, "Different Artist");
	await expect(wikipediaSearch(request)).resolves.toHaveProperty("data", {});
	expect(browser.tabs.create).not.toHaveBeenCalled();
});

test("matches multilingual labels and artist aliases", async () => {
	respond({ query: { search: [] } });
	respond({ query: { search: [{ title: "Q1" }] } });
	respond({
		entities: {
			Q1: {
				...entity,
				labels: { ja: { value: "音楽図鑑" } },
				sitelinks: {
					jawiki: {
						title: "音楽図鑑",
						url: "https://ja.wikipedia.org/wiki/音楽図鑑",
					},
				},
			},
		},
	});

	respond({
		entities: {
			Q2: {
				labels: { ja: { value: "坂本龍一" } },
				aliases: { en: [{ value: "Ryuichi Sakamoto" }] },
			},
		},
	});
	const result = await wikipediaSearch({
		...request,
		data: { artistName: "Ryuichi Sakamoto", albumTitle: "音楽図鑑" },
	});
	expect(result.data.url).toBe(
		new URL("https://ja.wikipedia.org/wiki/音楽図鑑").href,
	);
});

test("matches full-width punctuation and spacing in Asian Wikidata labels", async () => {
	respond({ query: { search: [] } });
	respond({ query: { search: [{ title: "Q1" }] } });
	respond({
		entities: {
			Q1: {
				...entity,
				labels: { ja: { value: "音楽図鑑（アルバム）" } },
				sitelinks: {
					jawiki: {
						title: "音楽図鑑",
						url: "https://ja.wikipedia.org/wiki/音楽図鑑",
					},
				},
			},
		},
	});
	respond({ entities: { Q2: { labels: { ja: { value: "坂本　龍一" } } } } });
	await expect(
		wikipediaSearch({
			...request,
			data: {
				artistName: "Ryuichi Sakamoto",
				albumTitle: "Ongaku Zukan",
				nativeArtistName: "坂本龍一",
				nativeAlbumTitle: "音楽図鑑",
			},
		}),
	).resolves.toHaveProperty(
		"data.url",
		new URL("https://ja.wikipedia.org/wiki/音楽図鑑").href,
	);
});

test("does not open an entity with a different title", async () => {
	respond({ query: { search: [] } });
	respond({ query: { search: [{ title: "Q1" }] } });
	respond({
		entities: {
			Q1: { ...entity, labels: { en: { value: "Different Album" } } },
		},
	});
	await expect(wikipediaSearch(request)).resolves.toHaveProperty("data", {});
	expect(browser.tabs.create).not.toHaveBeenCalled();
	expect(backgroundFetch).toHaveBeenCalledTimes(3);
});

test("reports no match when Wikidata has no results", async () => {
	respond({ query: { search: [] } });
	respond({ query: { search: [] } });
	await expect(wikipediaSearch(request)).resolves.toHaveProperty("data", {});
	expect(browser.tabs.create).not.toHaveBeenCalled();
});

test.each([
	"https://www.example.com/wiki/Example_Album",
	"https://en.wikipedia.org/wiki/Example_Album",
	"https://de.wikipedia.org.example.com/wiki/Example_Album",
])("does not open a non-fallback Wikipedia URL: %s", async (url) => {
	fallback({
		...entity,
		sitelinks: { dewiki: { title: "Example Album", url } },
	});
	await expect(wikipediaSearch(request)).resolves.toHaveProperty("data", {});
	expect(browser.tabs.create).not.toHaveBeenCalled();
});

test("surfaces Wikidata API errors instead of reporting no match", async () => {
	respond({ query: { search: [] } });
	respond({ error: { info: "Search unavailable" } });
	await expect(wikipediaSearch(request)).resolves.toHaveProperty(
		"data.error",
		"Search unavailable",
	);
	expect(browser.tabs.create).not.toHaveBeenCalled();
});

test("surfaces Wikidata HTTP errors", async () => {
	respond({ query: { search: [] } });
	respond({}, 503);
	await expect(wikipediaSearch(request)).resolves.toHaveProperty(
		"data.error",
		"Multilingual Wikipedia search failed.",
	);
	expect(browser.tabs.create).not.toHaveBeenCalled();
});
