import { type ReleaseType, releaseTypes } from "~/shared/release-types";
import * as cache from "~/shared/utils/cache";
import { runScript } from "~/shared/utils/dom";
import { createSerialQueue } from "~/shared/utils/serial-queue";
import { sleep } from "~/shared/utils/sleep";
import * as storage from "~/shared/utils/storage";
import { getCurrentUsername, normalizeUsername } from "~/shared/utils/user";

export type Releases = Map<string, boolean>;

export function readReleases(root: ParentNode): Releases {
	const releases: Releases = new Map();
	for (const row of root.querySelectorAll(".disco_release")) {
		if (!/^release_\d+$/.test(row.id)) continue;
		const catalog = row.querySelector(".disco_cat_inner");
		const text = catalog?.textContent?.trim() ?? "";
		const statuses = text.split("/").map((part) => part.trim());
		const rating = Number(statuses[0]);
		const listened =
			(rating > 0 && rating <= 5) ||
			statuses.some((status) => /^listened$/i.test(status)) ||
			!!row.querySelector(
				'.disco_cat [title="Listened"], .disco_cat [aria-label="Listened"]',
			);
		releases.set(row.id, (releases.get(row.id) ?? false) || listened);
	}
	return releases;
}

export function readTotal(root: ParentNode, type: ReleaseType): number | null {
	const label = root.querySelector(`#disco_header_showing_${type}`);
	const text = label?.textContent?.replaceAll(",", "") ?? "";
	const match = /Showing\s+(?:all\s*\((\d+)\)|\d+\s+of\s+(\d+))/i.exec(text);
	return match ? Number(match[1] ?? match[2]) : null;
}

function readEscape(
	body: string,
	index: number,
): { value: string; nextIndex: number } {
	const escaped = body[index++];
	if (escaped === "u" || escaped === "x") {
		const length = escaped === "u" ? 4 : 2;
		const hex = body.slice(index, index + length);
		if (!new RegExp(String.raw`^[\da-f]{${length}}$`, "i").test(hex)) {
			throw new Error("Invalid discography response escape");
		}
		return {
			value: String.fromCodePoint(Number.parseInt(hex, 16)),
			nextIndex: index + length,
		};
	}
	const escapes: Record<string, string> = {
		n: "\n",
		r: "\r",
		t: "\t",
		b: "\b",
		f: "\f",
		"/": "/",
		"\\": "\\",
		'"': '"',
		"'": "'",
	};
	if (!Object.hasOwn(escapes, escaped)) {
		throw new Error("Unsupported discography response escape");
	}
	return { value: escapes[escaped], nextIndex: index };
}

// RYM returns a JavaScript callback, not JSON. Decode only its string argument;
// never execute the response as code.
export function parseSectionResponse(
	body: string,
	type: ReleaseType,
): Document {
	const callback = new RegExp(
		String.raw`RYMartistPage\._expandDiscographySectionCallback\(\s*["']${type}["']\s*,\s*`,
	).exec(body);
	if (!callback) throw new Error("Missing discography response callback");
	let index = callback.index + callback[0].length;
	const quote = body[index++];
	if (quote !== '"' && quote !== "'") {
		throw new Error("Invalid discography response string");
	}
	let html = "";
	let closed = false;
	while (index < body.length) {
		const character = body[index++];
		if (character === quote) {
			closed = true;
			break;
		}
		if (character !== "\\") {
			html += character;
			continue;
		}
		const decoded = readEscape(body, index);
		html += decoded.value;
		index = decoded.nextIndex;
	}
	if (!closed || !/^\s*\)/.test(body.slice(index))) {
		throw new Error("Unterminated discography response");
	}
	return new DOMParser().parseFromString(html, "text/html");
}

const requests = new Map<string, Promise<Document>>();
const enqueue = createSerialQueue();
const requestInterval = () => 750 + Math.floor(Math.random() * 101);
const cooldownKey = "discography-progress.cooldown-until";
const cacheDuration = 3_600_000;
let nextRequestAt = Date.now() + requestInterval();
let cooldownUntil = 0;

export class DiscographyRateLimitError extends Error {
	constructor(readonly retryAt: number) {
		super(
			`RYM has rate-limited discography loading. Requests are paused until ${new Date(retryAt).toLocaleTimeString()}. Retry after that time.`,
		);
		this.name = "DiscographyRateLimitError";
	}
}

function retryAt(header: unknown): number {
	const now = Date.now();
	if (typeof header === "string" && header.trim()) {
		const seconds = Number(header);
		const time = Number.isFinite(seconds)
			? now + Math.max(0, seconds) * 1000
			: Date.parse(header);
		if (Number.isFinite(time)) return Math.max(now + 60_000, time);
	}
	return now + 5 * 60_000;
}

async function checkCooldown(): Promise<void> {
	const stored = await storage.get<number>(cooldownKey);
	if (typeof stored === "number" && Number.isFinite(stored)) {
		cooldownUntil = Math.max(cooldownUntil, stored);
	}
	if (Date.now() < cooldownUntil) {
		throw new DiscographyRateLimitError(cooldownUntil);
	}
}

export function loadSection(type: ReleaseType): Promise<Document> {
	const username = getCurrentUsername();
	const key = JSON.stringify([
		"artist-discography.v1",
		location.origin,
		username === null ? null : normalizeUsername(username),
		location.pathname,
		type,
		readTotal(document, type),
	]);
	const existing = requests.get(key);
	if (existing !== undefined) return existing;
	const request = enqueue(async () => {
		const cached = await readCachedSection(key, type);
		if (cached !== null) return cached;
		await checkCooldown();
		await sleep(Math.max(0, nextRequestAt - Date.now()));
		await checkCooldown();
		try {
			const section = await fetchSection(type);
			await cacheSection(key, section);
			return section;
		} catch (error) {
			if (error instanceof DiscographyRateLimitError) {
				cooldownUntil = Math.max(cooldownUntil, error.retryAt);
				try {
					await storage.set(cooldownKey, cooldownUntil);
				} catch (storageError) {
					console.error(
						"EvenBetterRYM: could not persist discography rate-limit cooldown",
						storageError,
					);
				}
			}
			throw error;
		} finally {
			nextRequestAt = Date.now() + requestInterval();
		}
	}).finally(() => {
		requests.delete(key);
	});
	requests.set(key, request);
	return request;
}

function validateSection(section: Document, type: ReleaseType): void {
	const total = readTotal(document, type);
	const count = readReleases(section).size;
	if (count === 0 || (total !== null && count < total)) {
		throw new Error(`Incomplete ${releaseTypes[type].label} response`);
	}
}

async function readCachedSection(
	key: string,
	type: ReleaseType,
): Promise<Document | null> {
	try {
		const html = await cache.get<unknown>(key);
		if (html === undefined) return null;
		if (typeof html !== "string") {
			throw new TypeError("Invalid cached discography response");
		}
		const section = new DOMParser().parseFromString(html, "text/html");
		validateSection(section, type);
		return section;
	} catch (error) {
		console.error("EvenBetterRYM: could not read discography cache", error);
		return null;
	}
}

async function cacheSection(key: string, section: Document): Promise<void> {
	try {
		await cache.set(key, section.body.innerHTML, cacheDuration);
	} catch (error) {
		console.error("EvenBetterRYM: could not cache discography response", error);
	}
}

async function fetchSection(type: ReleaseType): Promise<Document> {
	const id = crypto.randomUUID();
	const origin = location.origin;
	const body = await new Promise<string>((resolve, reject) => {
		const cleanup = () => {
			clearTimeout(timeout);
			window.removeEventListener("message", listener);
		};
		const listener = (
			event: MessageEvent<{
				type?: unknown;
				id?: unknown;
				body?: unknown;
				error?: unknown;
				status?: unknown;
				retryAfter?: unknown;
			}>,
		) => {
			if (
				event.source !== window ||
				event.origin !== origin ||
				event.data?.type !== "EBR_DISCOGRAPHY_RESULT" ||
				event.data.id !== id
			) {
				return;
			}
			cleanup();
			if (event.data.status === 429) {
				reject(new DiscographyRateLimitError(retryAt(event.data.retryAfter)));
			} else if (typeof event.data.error === "string") {
				reject(new Error(event.data.error));
			} else if (typeof event.data.body === "string") {
				resolve(event.data.body);
			} else {
				reject(new Error("Invalid discography response"));
			}
		};
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error("Discography request timed out"));
		}, 30_000);
		window.addEventListener("message", listener);
		void runScript(`;(async () => {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 25000);
			try {
				if (!globalThis.RYMartistPage?.artist_id || !globalThis.rym?.session?.token)
					throw new Error("RYM artist session is unavailable");
				const data = new FormData();
				const params = {
					action: "ExpandDiscographySection",
					artist_id: RYMartistPage.artist_id,
					artist_key: RYMartistPage.artist_key,
					type: ${JSON.stringify(type)},
					sort: "release_date.a,title.a",
					show_appearances: false,
					rym_ajax_req: 1,
					request_token: rym.session.token,
				};
				for (const [key, value] of Object.entries(params)) data.append(key, String(value));
				const response = await fetch("/httprequest/ExpandDiscographySection", {
					method: "POST", body: data, credentials: "include", signal: controller.signal,
				});
				if (response.status === 429) {
					window.postMessage({ type: "EBR_DISCOGRAPHY_RESULT", id: ${JSON.stringify(id)},
						status: 429, retryAfter: response.headers.get("Retry-After") }, location.origin);
					return;
				}
				if (!response.ok) throw new Error("HTTP " + response.status);
				window.postMessage({ type: "EBR_DISCOGRAPHY_RESULT", id: ${JSON.stringify(id)},
					body: await response.text() }, location.origin);
			} catch (error) {
				let message = "Discography request failed";
				if (error instanceof Error) message = error.message;
				else if (typeof error === "string") message = error;
				console.error("EvenBetterRYM: discography request failed", error);
				window.postMessage({ type: "EBR_DISCOGRAPHY_RESULT", id: ${JSON.stringify(id)},
					error: message }, location.origin);
			} finally { clearTimeout(timeout); }
		})();`).catch((error: unknown) => {
			cleanup();
			if (error instanceof Error) {
				reject(error);
				return;
			}
			const message =
				typeof error === "string"
					? error
					: "Could not inject discography request";
			reject(new Error(message, { cause: error }));
		});
	});
	const section = parseSectionResponse(body, type);
	validateSection(section, type);
	return section;
}
