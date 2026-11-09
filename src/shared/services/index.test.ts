import { beforeEach, expect, test, vi } from "vitest";

vi.mock("webextension-polyfill", () => ({
	default: { runtime: { getManifest: () => ({ manifest_version: 3 }) } },
}));
vi.mock("~/shared/utils/cache", () => ({
	withCache: (_key: string, operation: unknown) => operation,
}));
vi.mock("./applemusic/search", () => ({ search: vi.fn() }));
vi.mock("./bandcamp/search", () => ({ search: vi.fn() }));
vi.mock("./deezer/search", () => ({ search: vi.fn() }));
vi.mock("./qobuz/search", () => ({ search: vi.fn() }));
vi.mock("./soundcloud/search", () => ({ search: vi.fn() }));
vi.mock("./spotify/search", () => ({ search: vi.fn() }));
vi.mock("./tidal/search", () => ({ search: vi.fn() }));
vi.mock("./youtube/search", () => ({ search: vi.fn() }));

import { SEARCHABLES, SERVICES } from "./index";
import { isSearchable } from "./types";

beforeEach(() => vi.resetAllMocks());

test.each(
	SEARCHABLES,
)("uses the shared artist-alias fallback for $name", async (service) => {
	const original = SERVICES.filter(isSearchable).find(
		({ id }) => id === service.id,
	);
	if (!original) throw new Error(`Missing service: ${service.id}`);
	const search = vi.mocked(original.search);
	const url = `https://example.com/${service.id}/album`;
	search.mockResolvedValueOnce(undefined).mockResolvedValueOnce(url);
	const metadata = {
		artist: "7Б",
		artistAlias: "7B",
		title: "Солнцу решать",
	};
	await expect(service.search(metadata)).resolves.toBe(url);
	expect(search).toHaveBeenNthCalledWith(1, metadata);
	expect(search).toHaveBeenNthCalledWith(2, {
		...metadata,
		artist: "7B",
		artistAlias: "7Б",
	});
	expect(search).toHaveBeenCalledTimes(2);
});
