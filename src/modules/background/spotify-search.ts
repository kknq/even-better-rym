import browser from "webextension-polyfill";

import { searchHiddenSpotify } from "~/modules/spotify-search/hidden-search";
import {
	isSearchResult,
	type SearchInput,
	type SearchResult,
} from "~/modules/spotify-search/messages";
import type {
	SpotifySearchRequest,
	SpotifySearchResponse,
} from "~/shared/utils/messaging";

const OFFSCREEN_PATH = "src/modules/spotify-search/offscreen.html";
const FRAME_RULE_ID = 17001;

const searchOffscreen = async (data: SearchInput): Promise<SearchResult> => {
	if (typeof chrome === "undefined" || !chrome.offscreen)
		throw new Error("This browser does not support invisible Spotify search");

	// Only extension-owned search frames may bypass Spotify's framing restriction.
	// Regular Spotify tabs and frames embedded by websites retain their headers.
	await chrome.declarativeNetRequest.updateSessionRules({
		removeRuleIds: [FRAME_RULE_ID],
		addRules: [
			{
				id: FRAME_RULE_ID,
				priority: 1,
				action: {
					type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
					responseHeaders: [
						{
							header: "content-security-policy",
							operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
						},
						{
							header: "x-frame-options",
							operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
						},
					],
				},
				condition: {
					urlFilter: "|https://open.spotify.com/search/",
					initiatorDomains: [browser.runtime.id],
					resourceTypes: [chrome.declarativeNetRequest.ResourceType.SUB_FRAME],
				},
			},
		],
	});
	try {
		if (!(await chrome.offscreen.hasDocument()))
			await chrome.offscreen.createDocument({
				url: OFFSCREEN_PATH,
				reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
				justification:
					"Read Spotify search results without opening a tab or window",
			});
		const result: unknown = await browser.runtime.sendMessage({
			type: "ebr-spotify-offscreen",
			data,
		});
		if (!isSearchResult(result))
			throw new Error("Spotify background search returned an invalid response");
		return result;
	} finally {
		try {
			if (await chrome.offscreen.hasDocument())
				await chrome.offscreen.closeDocument();
		} finally {
			await chrome.declarativeNetRequest.updateSessionRules({
				removeRuleIds: [FRAME_RULE_ID],
			});
		}
	}
};

const searchBackgroundPage = async (
	data: SearchInput,
): Promise<SearchResult> => {
	const onHeaders: Parameters<
		typeof browser.webRequest.onHeadersReceived.addListener
	>[0] = (details) => {
		if (!details.originUrl?.startsWith(browser.runtime.getURL("")))
			return undefined;
		return {
			responseHeaders: details.responseHeaders
				?.filter((header) => header.name.toLowerCase() !== "x-frame-options")
				.map((header) =>
					header.name.toLowerCase() === "content-security-policy"
						? {
								...header,
								value: header.value
									?.split(";")
									.filter(
										(directive) => !/^\s*frame-ancestors\b/i.test(directive),
									)
									.join(";"),
							}
						: header,
				),
		};
	};
	browser.webRequest.onHeadersReceived.addListener(
		onHeaders,
		{
			urls: ["https://open.spotify.com/search/*"],
			types: ["sub_frame"],
		},
		["blocking", "responseHeaders"],
	);
	try {
		return await searchHiddenSpotify(data);
	} finally {
		browser.webRequest.onHeadersReceived.removeListener(onHeaders);
	}
};

// Chromium permits only one offscreen document per extension.
let queue = Promise.resolve();
export const spotifySearch = (
	request: SpotifySearchRequest,
): Promise<SpotifySearchResponse> => {
	const lookup = queue.then(async (): Promise<SpotifySearchResponse> => {
		try {
			const result =
				browser.runtime.getManifest().manifest_version === 2
					? await searchBackgroundPage(request.data)
					: await searchOffscreen(request.data);
			return {
				id: request.id,
				type: "spotifySearch",
				data:
					result.status === "error"
						? { error: result.message }
						: result.status === "found"
							? { url: result.url }
							: {},
			};
		} catch (error) {
			return {
				id: request.id,
				type: "spotifySearch",
				data: { error: error instanceof Error ? error.message : String(error) },
			};
		}
	});
	queue = lookup.then(() => undefined);
	return lookup;
};
