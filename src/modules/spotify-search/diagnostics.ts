import type { SearchDiagnostic } from "./messages";

export type SpotifyPageError = {
	kind: "error" | "unhandledrejection" | "resource-error";
	name: string;
	message: string;
	stack: string;
	source: string;
	line: number;
	column: number;
};

const isPageError = (value: unknown): value is SpotifyPageError => {
	if (typeof value !== "object" || value === null) return false;
	return (
		"kind" in value &&
		(value.kind === "error" ||
			value.kind === "unhandledrejection" ||
			value.kind === "resource-error") &&
		"name" in value &&
		typeof value.name === "string" &&
		value.name.length <= 100 &&
		"message" in value &&
		typeof value.message === "string" &&
		value.message.length <= 1_000 &&
		"stack" in value &&
		typeof value.stack === "string" &&
		value.stack.length <= 2_000 &&
		"source" in value &&
		typeof value.source === "string" &&
		value.source.length <= 1_000 &&
		"line" in value &&
		typeof value.line === "number" &&
		Number.isSafeInteger(value.line) &&
		"column" in value &&
		typeof value.column === "number" &&
		Number.isSafeInteger(value.column)
	);
};

const resourcePath = (url: string): string => {
	try {
		const parsed = new URL(url);
		// Search terms, query parameters, and fragments are not diagnostic data.
		return parsed.origin === "https://open.spotify.com" &&
			parsed.pathname.startsWith("/search/")
			? `${parsed.origin}/search/[query]`
			: `${parsed.origin}${parsed.pathname}`.slice(0, 300);
	} catch {
		return "[invalid URL]";
	}
};

const sanitizeErrorText = (
	value: string,
	searchTerms: string[],
	limit: number,
): string => {
	let text = value
		.replace(/https?:\/\/[^\s"'<>]+/g, resourcePath)
		.replace(/\b(?:Bearer|Basic)\s+\S+/gi, "[redacted authorization]")
		.replace(
			/((?:access_token|refresh_token|client_secret|authorization|cookie|password|token)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}]+)/gi,
			"$1[redacted]",
		)
		.replace(/\b[A-Za-z0-9_=-]{64,}\b/g, "[redacted token]");
	for (const term of searchTerms) {
		if (!term) continue;
		text = text.replaceAll(term, "[query]");
		text = text.replaceAll(encodeURIComponent(term), "[query]");
	}
	return text.slice(0, limit);
};

export const captureSpotifyPageErrors = () => {
	let available = false;
	let errors: SpotifyPageError[] = [];
	const onMessage = (event: MessageEvent<unknown>) => {
		if (
			event.source !== window ||
			event.origin !== "https://open.spotify.com" ||
			typeof event.data !== "object" ||
			event.data === null ||
			!("type" in event.data) ||
			event.data.type !== "ebr-spotify-page-errors" ||
			!("errors" in event.data) ||
			!Array.isArray(event.data.errors) ||
			event.data.errors.length > 8 ||
			!event.data.errors.every(isPageError)
		)
			return;
		available = true;
		errors = event.data.errors;
	};
	window.addEventListener("message", onMessage);
	window.postMessage(
		{ type: "ebr-spotify-page-errors-request" },
		"https://open.spotify.com",
	);
	return {
		hasErrors: () => errors.length > 0,
		diagnostic: (searchTerms: string[]): SearchDiagnostic => {
			const sanitized = errors.map((error) => ({
				kind: error.kind,
				name: sanitizeErrorText(error.name, searchTerms, 100),
				message: sanitizeErrorText(error.message, searchTerms, 300),
				stack: sanitizeErrorText(error.stack, searchTerms, 700),
				source: sanitizeErrorText(error.source, searchTerms, 300),
				line: error.line,
				column: error.column,
			}));
			let details = JSON.stringify({ available, errors: sanitized });
			while (details.length > 16_000 && sanitized.length) {
				sanitized.pop();
				details = JSON.stringify({ available, errors: sanitized });
			}
			return { stage: "page-runtime-errors", details };
		},
		dispose: () => window.removeEventListener("message", onMessage),
	};
};

export const spotifyPageDiagnostics = (): string => {
	const main = document.querySelector("main");
	const bodyText = document.body?.textContent ?? "";
	const resources = performance
		.getEntriesByType("resource")
		.filter(
			(entry): entry is PerformanceResourceTiming =>
				entry instanceof PerformanceResourceTiming,
		);
	return JSON.stringify({
		url: resourcePath(location.href),
		readyState: document.readyState,
		visibility: document.visibilityState,
		online: navigator.onLine,
		hasMain: main !== null,
		hasSpotifyError: bodyText.includes("Something went wrong"),
		hasReloadButton: bodyText.includes("Reload page"),
		hasNoResults: main?.textContent?.includes("No results found") ?? false,
		albumLinks: main?.querySelectorAll('a[href*="/album/"]').length ?? 0,
		trackLinks: main?.querySelectorAll('a[href*="/track/"]').length ?? 0,
		scriptCount: document.scripts.length,
		resources: resources.slice(-30).map((entry) => ({
			url: resourcePath(entry.name),
			type: entry.initiatorType,
			responseStatus: entry.responseStatus,
			transferSize: entry.transferSize,
		})),
	});
};
