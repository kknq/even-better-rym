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
