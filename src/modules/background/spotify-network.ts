import browser from "webextension-polyfill";
import type { SearchDiagnostic } from "~/modules/spotify-search/messages";

type RequestOutcome = {
	endpoint: "token" | "connection-discovery";
	error?: string;
	status?: number;
};

const endpoint = (url: string): RequestOutcome["endpoint"] | undefined => {
	const parsed = new URL(url);
	if (
		parsed.origin === "https://open.spotify.com" &&
		parsed.pathname === "/api/token"
	)
		return "token";
	if (parsed.origin === "https://apresolve.spotify.com")
		return "connection-discovery";
	return undefined;
};

export const spotifyNetworkDiagnostics = () => {
	const frames = new Set<number>();
	const pending = new Map<string, RequestOutcome["endpoint"]>();
	const outcomes: RequestOutcome[] = [];
	let started = false;
	let stopped = false;
	const extensionOrigin = browser.runtime.getURL("").replace(/\/$/, "");
	const filter = {
		urls: ["https://open.spotify.com/*", "https://apresolve.spotify.com/*"],
	};
	const onBeforeRequest: Parameters<
		typeof browser.webRequest.onBeforeRequest.addListener
	>[0] = (details) => {
		if (details.tabId !== -1) return;
		if (details.type === "sub_frame") {
			const initiator = details.initiator ?? details.originUrl;
			if (
				(initiator?.replace(/\/$/, "") === extensionOrigin ||
					initiator?.startsWith(`${extensionOrigin}/`)) &&
				details.url.startsWith("https://open.spotify.com/search/")
			)
				frames.add(details.frameId);
			else frames.delete(details.frameId);
		}
		if (!frames.has(details.frameId)) return;
		const name = endpoint(details.url);
		if (name && pending.size < 20) pending.set(details.requestId, name);
	};
	const onCompleted: Parameters<
		typeof browser.webRequest.onCompleted.addListener
	>[0] = (details) => {
		const name = pending.get(details.requestId);
		if (!name) return;
		pending.delete(details.requestId);
		if (outcomes.length < 20)
			outcomes.push({ endpoint: name, status: details.statusCode });
	};
	const onError: Parameters<
		typeof browser.webRequest.onErrorOccurred.addListener
	>[0] = (details) => {
		const name = pending.get(details.requestId);
		if (!name) return;
		pending.delete(details.requestId);
		if (outcomes.length < 20)
			outcomes.push({
				endpoint: name,
				error: /^(?:net::ERR_[A-Z0-9_]+|NS_ERROR_[A-Z0-9_]+)$/.test(
					details.error,
				)
					? details.error
					: "[unrecognized network error]",
			});
	};
	const stop = () => {
		browser.webRequest.onBeforeRequest.removeListener(onBeforeRequest);
		browser.webRequest.onCompleted.removeListener(onCompleted);
		browser.webRequest.onErrorOccurred.removeListener(onError);
		stopped = true;
	};
	return {
		start: () => {
			try {
				browser.webRequest.onBeforeRequest.addListener(onBeforeRequest, filter);
				browser.webRequest.onCompleted.addListener(onCompleted, filter);
				browser.webRequest.onErrorOccurred.addListener(onError, filter);
				started = true;
			} catch (error) {
				stop();
				throw error;
			}
			return stop;
		},
		diagnostic: (): SearchDiagnostic => ({
			stage: "network-requests",
			details: JSON.stringify({
				started,
				stopped,
				ownedFrames: frames.size,
				outcomes,
				pending: [...pending.values()],
			}),
		}),
	};
};
