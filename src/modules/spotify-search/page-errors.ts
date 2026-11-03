import type { SpotifyPageError } from "./diagnostics";

// This entry must remain self-contained so the bundler emits a synchronous
// MAIN-world script, without a loader that requires extension APIs.
(() => {
	if (window.parent === window) return;
	const errors: SpotifyPageError[] = [];
	const publish = () =>
		window.postMessage(
			{ type: "ebr-spotify-page-errors", errors },
			"https://open.spotify.com",
		);
	const record = (entry: SpotifyPageError) => {
		if (errors.length >= 8) return;
		errors.push(entry);
		publish();
	};
	window.addEventListener(
		"error",
		(event: Event) => {
			if (!(event instanceof ErrorEvent)) {
				const target = event.target;
				if (
					target instanceof HTMLScriptElement ||
					target instanceof HTMLLinkElement
				)
					record({
						kind: "resource-error",
						name: "ResourceError",
						message: "Spotify page resource failed to load",
						stack: "",
						source: (target instanceof HTMLScriptElement
							? target.src
							: target.href
						).slice(0, 1_000),
						line: 0,
						column: 0,
					});
				return;
			}
			const error: unknown = event.error;
			record({
				kind: "error",
				name: error instanceof Error ? error.name.slice(0, 100) : "Error",
				message: event.message.slice(0, 1_000),
				stack:
					error instanceof Error ? (error.stack ?? "").slice(0, 2_000) : "",
				source: event.filename.slice(0, 1_000),
				line: event.lineno,
				column: event.colno,
			});
		},
		true,
	);
	window.addEventListener("unhandledrejection", (event) => {
		const reason: unknown = event.reason;
		record({
			kind: "unhandledrejection",
			name: reason instanceof Error ? reason.name.slice(0, 100) : "Error",
			message: (reason instanceof Error
				? reason.message
				: typeof reason === "string"
					? reason
					: "[non-Error rejection]"
			).slice(0, 1_000),
			stack:
				reason instanceof Error ? (reason.stack ?? "").slice(0, 2_000) : "",
			source: "",
			line: 0,
			column: 0,
		});
	});
	window.addEventListener("message", (event: MessageEvent<unknown>) => {
		if (
			event.source === window &&
			event.origin === "https://open.spotify.com" &&
			typeof event.data === "object" &&
			event.data !== null &&
			"type" in event.data &&
			event.data.type === "ebr-spotify-page-errors-request"
		)
			publish();
	});
	publish();
})();
