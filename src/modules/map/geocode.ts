import offlineGeoCsv from "./cities.csv?raw";
import type { CityPoint } from "./types";

// Simple Nominatim geocode helper with localStorage caching and basic rate-limiting.
// Notes: Nominatim is free and reliable for light use but rate-limited for heavy traffic.

const CACHE_KEY = "rymmt_geocode_cache_v1";
const cache: Record<string, CityPoint> = JSON.parse(
	localStorage.getItem(CACHE_KEY) ?? "{}",
) as Record<string, CityPoint>;
let lastRequestAt = 0;
const MIN_DELAY = 1100; // 1.1s between requests to be polite to Nominatim

const offlineLocationsById = new Map<string, CityPoint>();
const offlineLocationsByName = new Map<string, CityPoint>();
let offlineLocationsLoaded = false;

// Scale factors to convert large-map lon/lat to the small-map SVG cx/cy system.
// Derived to match example mapping for loc_3780 (Juazeiro):
// lat=-9.421298, lon=-40.501518 -> cx=-56.25210833333333, cy=13.144504061613896
// lonScale = cx / lon = 1.388888888888889
// latScale = -cy / lat = 1.3951903508002714
const SMALL_MAP_LON_SCALE = 1.388888888888889;
const SMALL_MAP_LAT_SCALE = 1.3951903508002714;

async function delay(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

function normalizeLocationKey(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function loadOfflineLocations() {
	if (offlineLocationsLoaded) return;

	for (const line of offlineGeoCsv.split(/\r?\n/)) {
		if (!line.trim() || line.startsWith("loc_id")) continue;
		const parts = line.split(",");
		if (parts.length < 4) continue;

		const id = parts[0].trim();
		const lon = Number(parts.pop());
		const lat = Number(parts.pop());
		const name = parts.slice(1).join(",").trim();
		if (!id || Number.isNaN(lat) || Number.isNaN(lon)) continue;

		const point: CityPoint = { name, lat, lon };
		offlineLocationsById.set(id.toLowerCase(), point);
		offlineLocationsByName.set(normalizeLocationKey(name), point);
	}
	offlineLocationsLoaded = true;
}

export function getOfflineLocationById(id: string): CityPoint | null {
	if (!id) return null;
	loadOfflineLocations();
	return offlineLocationsById.get(id.trim().toLowerCase()) ?? null;
}

export function getOfflineLocationByName(name: string): CityPoint | null {
	if (!name) return null;
	loadOfflineLocations();
	return offlineLocationsByName.get(normalizeLocationKey(name)) ?? null;
}

export function findOfflineLocation(query: string): CityPoint | null {
	if (!query) return null;
	const idMatch = /loc_\d+/i.exec(query.trim());
	if (idMatch) return getOfflineLocationById(idMatch[0]);
	return getOfflineLocationByName(query);
}

export function latLonToSmallMapCoords(lat: number, lon: number) {
	return {
		cx: lon * SMALL_MAP_LON_SCALE,
		cy: -lat * SMALL_MAP_LAT_SCALE - 5,
	};
}

export async function geocodeCity(city: string): Promise<CityPoint | null> {
	const key = city.trim().toLowerCase();
	if (!key) return null;
	if (cache[key]) return cache[key];

	const offline = findOfflineLocation(city);
	if (offline) {
		cache[key] = offline;
		localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
		return offline;
	}

	// TODO: Add request de-duplication/queueing so simultaneous uncached cities
	// do not trigger overlapping Nominatim requests.
	const since = Date.now() - lastRequestAt;
	if (since < MIN_DELAY) await delay(MIN_DELAY - since);

	const q = encodeURIComponent(city);
	// User-agent and email are recommended by Nominatim usage policy; include minimal info.
	const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
	try {
		const res = await fetch(url, {
			headers: { "Accept-Language": "en-US,en;q=0.9" },
		});
		lastRequestAt = Date.now();
		if (!res.ok) return null;
		const arr = await res.json();
		if (!arr?.length) return null;
		const first = arr[0];
		const point: CityPoint = {
			name: city,
			lat: Number(first.lat),
			lon: Number(first.lon),
		};
		cache[key] = point;
		localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
		return point;
	} catch (e) {
		console.warn("geocodeCity error", e);
		return null;
	}
}

export function seedLocalGeocode(list: CityPoint[]) {
	for (const p of list) {
		cache[p.name.trim().toLowerCase()] = p;
	}
	localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function getCachedCity(city: string): CityPoint | null {
	const key = city.trim().toLowerCase();
	return cache[key] ?? findOfflineLocation(city);
}
