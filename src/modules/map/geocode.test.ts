import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import * as storage from "~/shared/utils/storage";
import type { CityPoint } from "./types";

vi.mock("~/shared/utils/storage", () => ({
	get: vi.fn(),
	set: vi.fn(),
}));

vi.mock("./cities.csv?raw", () => ({
	default: [
		"loc_id,name,latitude,longitude",
		"loc_1,Test City,10.5,-20.25",
		"loc_2,Other City, Region,-30,40",
		"loc_3,,50,60",
		"loc_4,Invalid City,invalid,20",
		",Missing ID,10,20",
		"malformed",
		"",
	].join("\r\n"),
}));

const point: CityPoint = { name: "Remote City", lat: 12.5, lon: -34.5 };
const fetchMock = vi.fn<typeof fetch>();
let geocode: typeof import("./geocode");

beforeEach(async () => {
	vi.resetModules();
	vi.resetAllMocks();
	vi.stubGlobal("fetch", fetchMock);
	vi.mocked(storage.get).mockResolvedValue(undefined);
	vi.mocked(storage.set).mockResolvedValue();
	geocode = await import("./geocode");
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("offline locations", () => {
	test("looks up IDs without regard to surrounding whitespace or case", () => {
		expect(geocode.getOfflineLocationById(" LOC_1 ")).toEqual({
			name: "Test City",
			lat: 10.5,
			lon: -20.25,
		});
	});

	test("normalizes whitespace and case in names", () => {
		expect(geocode.getOfflineLocationByName("  TEST   CITY  ")).toEqual({
			name: "Test City",
			lat: 10.5,
			lon: -20.25,
		});
	});

	test("parses names containing commas and locations without names", () => {
		expect(geocode.getOfflineLocationByName("Other City, Region")).toEqual({
			name: "Other City, Region",
			lat: -30,
			lon: 40,
		});
		expect(geocode.getOfflineLocationById("loc_3")).toEqual({
			name: "",
			lat: 50,
			lon: 60,
		});
	});

	test("ignores malformed rows and returns null for missing locations", () => {
		expect(geocode.getOfflineLocationById("loc_4")).toBeNull();
		expect(geocode.getOfflineLocationByName("Missing ID")).toBeNull();
		expect(geocode.getOfflineLocationById("")).toBeNull();
		expect(geocode.getOfflineLocationByName("")).toBeNull();
		expect(geocode.getOfflineLocationById("loc_999")).toBeNull();
	});

	test("resolves embedded location IDs and plain names", () => {
		const location = geocode.getOfflineLocationById("loc_1");
		expect(geocode.findOfflineLocation("/location/LOC_1/")).toEqual(location);
		expect(geocode.findOfflineLocation("Test City")).toEqual(location);
		expect(geocode.findOfflineLocation("")).toBeNull();
		expect(geocode.findOfflineLocation("Unknown City")).toBeNull();
	});
});

describe("latLonToSmallMapCoords", () => {
	test("applies longitude and inverted latitude scales plus the map offset", () => {
		const { cx, cy } = geocode.latLonToSmallMapCoords(10, -20);
		expect(cx).toBeCloseTo(-27.7777777778);
		expect(cy).toBeCloseTo(-18.951903508);
		expect(geocode.latLonToSmallMapCoords(0, 0)).toEqual({ cx: 0, cy: -5 });
	});
});

describe("geocodeCity", () => {
	test("does no work for an empty city", async () => {
		await expect(geocode.geocodeCity("  ")).resolves.toBeNull();
		expect(storage.get).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("returns a cached location before consulting offline data", async () => {
		vi.mocked(storage.get).mockResolvedValue(point);
		await expect(geocode.geocodeCity(" Test City ")).resolves.toEqual(point);
		expect(storage.get).toHaveBeenCalledWith(
			"rymmt_geocode_cache_v1:test city",
		);
		expect(storage.set).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("caches offline locations without a network request", async () => {
		const offline = geocode.getOfflineLocationById("loc_1");
		await expect(geocode.geocodeCity("TEST CITY")).resolves.toEqual(offline);
		expect(storage.set).toHaveBeenCalledWith(
			"rymmt_geocode_cache_v1:test city",
			offline,
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("encodes network queries, converts coordinates, and caches the result", async () => {
		fetchMock.mockResolvedValue(Response.json([{ lat: "12.5", lon: "-34.5" }]));
		await expect(geocode.geocodeCity("Remote City")).resolves.toEqual(point);
		expect(fetchMock).toHaveBeenCalledWith(
			"https://nominatim.openstreetmap.org/search?q=Remote%20City&format=json&limit=1",
			{ headers: { "Accept-Language": "en-US,en;q=0.9" } },
		);
		expect(storage.set).toHaveBeenCalledWith(
			"rymmt_geocode_cache_v1:remote city",
			point,
		);
	});

	test.each([
		["HTTP failure", () => new Response(null, { status: 503 })],
		["no results", () => Response.json([])],
	])("does not cache %s", async (_label, response) => {
		fetchMock.mockResolvedValue(response());
		await expect(geocode.geocodeCity("Remote City")).resolves.toBeNull();
		expect(storage.set).not.toHaveBeenCalled();
	});

	test("logs network failures and returns null", async () => {
		const error = new Error("offline");
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		fetchMock.mockRejectedValue(error);
		await expect(geocode.geocodeCity("Remote City")).resolves.toBeNull();
		expect(warn).toHaveBeenCalledWith("geocodeCity error", error);
		expect(storage.set).not.toHaveBeenCalled();
	});

	test("logs malformed JSON responses and returns null", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		fetchMock.mockResolvedValue(new Response("not JSON"));
		await expect(geocode.geocodeCity("Remote City")).resolves.toBeNull();
		expect(warn).toHaveBeenCalledWith(
			"geocodeCity error",
			expect.any(SyntaxError),
		);
		expect(storage.set).not.toHaveBeenCalled();
	});

	test("waits exactly 1100ms between sequential network requests", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
		fetchMock.mockImplementation(() =>
			Promise.resolve(Response.json([{ lat: "1", lon: "2" }])),
		);
		await geocode.geocodeCity("First Remote City");
		const second = geocode.geocodeCity("Second Remote City");

		await vi.advanceTimersByTimeAsync(1099);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		await second;
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test("propagates storage failures rather than fetching or hiding them", async () => {
		vi.mocked(storage.get).mockRejectedValue(new Error("storage unavailable"));
		await expect(geocode.geocodeCity("Remote City")).rejects.toThrow(
			"storage unavailable",
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe("cached city helpers", () => {
	test("seeds normalized storage keys for each supplied location", async () => {
		const other = { name: " Other City ", lat: 1, lon: 2 };
		await geocode.seedLocalGeocode([point, other]);
		expect(storage.set).toHaveBeenCalledTimes(2);
		expect(storage.set).toHaveBeenCalledWith(
			"rymmt_geocode_cache_v1:remote city",
			point,
		);
		expect(storage.set).toHaveBeenCalledWith(
			"rymmt_geocode_cache_v1:other city",
			other,
		);
	});

	test("gets cached cities without fetching or writing", async () => {
		vi.mocked(storage.get).mockResolvedValue(point);
		await expect(geocode.getCachedCity("REMOTE CITY")).resolves.toEqual(point);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(storage.set).not.toHaveBeenCalled();
	});

	test("falls back to offline data or null without fetching", async () => {
		await expect(geocode.getCachedCity("loc_1")).resolves.toEqual(
			geocode.getOfflineLocationById("loc_1"),
		);
		await expect(geocode.getCachedCity("Unknown City")).resolves.toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
		expect(storage.set).not.toHaveBeenCalled();
	});
});
