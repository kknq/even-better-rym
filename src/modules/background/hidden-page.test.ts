import { afterEach, beforeEach, expect, test, vi } from "vitest";
import browser from "webextension-polyfill";
import { isSearchResult } from "~/modules/spotify-search/messages";
import { isTidalCreditsResult } from "~/shared/services/tidal/credits-page";
import { readHiddenPage } from "./hidden-page";

vi.mock("webextension-polyfill", () => ({
	default: {
		runtime: {
			id: "extension-id",
			getURL: (path: string) => `moz-extension://extension-id/${path}`,
			getManifest: vi.fn(),
			sendMessage: vi.fn(),
		},
		tabs: { create: vi.fn() },
		windows: { create: vi.fn() },
		webRequest: {
			onHeadersReceived: { addListener: vi.fn(), removeListener: vi.fn() },
		},
	},
}));

const chromeMock = {
	offscreen: {
		hasDocument: vi.fn(),
		createDocument: vi.fn(),
		closeDocument: vi.fn(),
		Reason: { DOM_SCRAPING: "DOM_SCRAPING" },
	},
	declarativeNetRequest: {
		updateSessionRules: vi.fn(),
		RuleActionType: { MODIFY_HEADERS: "modifyHeaders" },
		HeaderOperation: { REMOVE: "remove" },
		ResourceType: { SUB_FRAME: "sub_frame" },
	},
};
const result = { tracks: [{ id: "101", credits: [] }] };
const backgroundRead = vi.fn();
const job = () => ({
	name: "Tidal credits",
	frameUrlPrefix: "https://tidal.com/album/",
	message: {
		type: "ebr-tidal-offscreen",
		data: { albumId: "123", trackIds: ["101"] },
	},
	readBackground: backgroundRead,
	isResult: isTidalCreditsResult,
});
beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal("chrome", chromeMock);
	vi.mocked(browser.runtime.getManifest).mockReturnValue({
		manifest_version: 3,
		name: "Test",
		version: "1",
	});
	vi.mocked(browser.runtime.sendMessage).mockReset().mockResolvedValue(result);
	chromeMock.offscreen.hasDocument
		.mockReset()
		.mockResolvedValueOnce(false)
		.mockResolvedValue(true);
	chromeMock.offscreen.createDocument.mockReset().mockResolvedValue(undefined);
	chromeMock.offscreen.closeDocument.mockReset().mockResolvedValue(undefined);
	chromeMock.declarativeNetRequest.updateSessionRules
		.mockReset()
		.mockResolvedValue(undefined);
	backgroundRead.mockReset().mockResolvedValue(result);
});
afterEach(() => vi.unstubAllGlobals());

test("uses an offscreen document without creating any tabs or windows", async () => {
	await expect(readHiddenPage(job())).resolves.toEqual(result);
	expect(chromeMock.offscreen.createDocument).toHaveBeenCalledExactlyOnceWith({
		url: "src/modules/hidden-page/offscreen.html",
		reasons: ["DOM_SCRAPING"],
		justification: "Read Tidal credits without opening a tab or window",
	});
	expect(browser.runtime.sendMessage).toHaveBeenCalledExactlyOnceWith(
		job().message,
	);
	expect(browser.tabs.create).not.toHaveBeenCalled();
	expect(browser.windows.create).not.toHaveBeenCalled();
	expect(chromeMock.offscreen.closeDocument).toHaveBeenCalledOnce();
	expect(
		chromeMock.declarativeNetRequest.updateSessionRules,
	).toHaveBeenNthCalledWith(1, {
		removeRuleIds: [17001],
		addRules: [
			{
				id: 17001,
				priority: 1,
				action: {
					type: "modifyHeaders",
					responseHeaders: [
						{ header: "content-security-policy", operation: "remove" },
						{ header: "x-frame-options", operation: "remove" },
					],
				},
				condition: {
					urlFilter: "|https://tidal.com/album/",
					initiatorDomains: ["extension-id"],
					resourceTypes: ["sub_frame"],
				},
			},
		],
	});
	expect(
		chromeMock.declarativeNetRequest.updateSessionRules,
	).toHaveBeenLastCalledWith({ removeRuleIds: [17001] });
});

test("serializes Tidal and Spotify jobs through the same offscreen queue", async () => {
	let finish: ((value: unknown) => void) | undefined;
	vi.mocked(browser.runtime.sendMessage)
		.mockReset()
		.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		)
		.mockResolvedValueOnce({ status: "not-found" });
	const tidal = readHiddenPage(job());
	const spotify = readHiddenPage({
		name: "Spotify search",
		frameUrlPrefix: "https://open.spotify.com/search/",
		message: { type: "ebr-spotify-offscreen", data: {} },
		readBackground: vi.fn(),
		isResult: isSearchResult,
	});
	await vi.waitFor(() =>
		expect(browser.runtime.sendMessage).toHaveBeenCalledTimes(1),
	);
	expect(chromeMock.offscreen.closeDocument).not.toHaveBeenCalled();
	finish?.(result);
	await expect(tidal).resolves.toEqual(result);
	await expect(spotify).resolves.toEqual({ status: "not-found" });
	expect(chromeMock.offscreen.closeDocument).toHaveBeenCalledTimes(2);
	expect(browser.runtime.sendMessage).toHaveBeenNthCalledWith(2, {
		type: "ebr-spotify-offscreen",
		data: {},
	});
});

test("cleans up failed jobs and lets the next job run", async () => {
	vi.mocked(browser.runtime.sendMessage).mockRejectedValueOnce(
		new Error("Frame failed"),
	);
	await expect(readHiddenPage(job())).rejects.toThrow("Frame failed");
	expect(chromeMock.offscreen.closeDocument).toHaveBeenCalledOnce();
	expect(
		chromeMock.declarativeNetRequest.updateSessionRules,
	).toHaveBeenLastCalledWith({ removeRuleIds: [17001] });
	await expect(readHiddenPage(job())).resolves.toEqual(result);
});

test("rejects invalid offscreen results instead of reporting successful empty data", async () => {
	vi.mocked(browser.runtime.sendMessage).mockResolvedValueOnce({
		tracks: null,
	});
	await expect(readHiddenPage(job())).rejects.toThrow(
		"invalid background response",
	);
	expect(chromeMock.offscreen.closeDocument).toHaveBeenCalledOnce();
});

test("removes its framing exception even when offscreen cleanup fails", async () => {
	chromeMock.offscreen.closeDocument.mockRejectedValueOnce(
		new Error("Close failed"),
	);
	await expect(readHiddenPage(job())).rejects.toThrow("Close failed");
	expect(
		chromeMock.declarativeNetRequest.updateSessionRules,
	).toHaveBeenLastCalledWith({ removeRuleIds: [17001] });
});

test("does not fall back to visible UI when offscreen rendering is unavailable", async () => {
	vi.stubGlobal("chrome", undefined);
	await expect(readHiddenPage(job())).rejects.toThrow(
		"does not support invisible",
	);
	expect(browser.tabs.create).not.toHaveBeenCalled();
	expect(browser.windows.create).not.toHaveBeenCalled();
});

test("uses the MV2 background document and removes the header listener afterward", async () => {
	vi.mocked(browser.runtime.getManifest).mockReturnValue({
		manifest_version: 2,
		name: "Test",
		version: "1",
	});
	await expect(readHiddenPage(job())).resolves.toEqual(result);
	expect(backgroundRead).toHaveBeenCalledOnce();
	expect(chromeMock.offscreen.createDocument).not.toHaveBeenCalled();
	expect(browser.tabs.create).not.toHaveBeenCalled();
	expect(browser.windows.create).not.toHaveBeenCalled();
	expect(browser.webRequest.onHeadersReceived.addListener).toHaveBeenCalledWith(
		expect.any(Function),
		{ urls: ["https://tidal.com/album/*"], types: ["sub_frame"] },
		["blocking", "responseHeaders"],
	);
	const listener = vi.mocked(browser.webRequest.onHeadersReceived.addListener)
		.mock.calls[0]?.[0];
	expect(
		browser.webRequest.onHeadersReceived.removeListener,
	).toHaveBeenCalledExactlyOnceWith(listener);
});

test("MV2 framing exceptions leave ordinary website frames untouched", async () => {
	vi.mocked(browser.runtime.getManifest).mockReturnValue({
		manifest_version: 2,
		name: "Test",
		version: "1",
	});
	await readHiddenPage(job());
	const listener = vi.mocked(browser.webRequest.onHeadersReceived.addListener)
		.mock.calls[0]?.[0];
	if (!listener) throw new Error("Missing framing listener");
	const details = {
		requestId: "frame-request",
		url: "https://tidal.com/album/123/credits",
		method: "GET",
		frameId: 1,
		parentFrameId: 0,
		tabId: -1,
		thirdParty: true,
		type: "sub_frame" as const,
		timeStamp: 0,
		statusCode: 200,
		statusLine: "HTTP/2 200",
		responseHeaders: [
			{ name: "X-Frame-Options", value: "DENY" },
			{
				name: "Content-Security-Policy",
				value: "default-src 'self'; frame-ancestors 'none'; script-src 'self'",
			},
			{ name: "Content-Type", value: "text/html" },
		],
	};
	expect(listener(details)).toBeUndefined();
	expect(
		listener({ ...details, originUrl: "https://example.com/" }),
	).toBeUndefined();
	expect(
		listener({
			...details,
			originUrl: "moz-extension://extension-id/background.html",
		}),
	).toEqual({
		responseHeaders: [
			{
				name: "Content-Security-Policy",
				value: "default-src 'self'; script-src 'self'",
			},
			{ name: "Content-Type", value: "text/html" },
		],
	});
});

test("removes the MV2 framing listener when the hidden reader fails", async () => {
	vi.mocked(browser.runtime.getManifest).mockReturnValue({
		manifest_version: 2,
		name: "Test",
		version: "1",
	});
	backgroundRead.mockRejectedValueOnce(new Error("Hidden frame failed"));
	await expect(readHiddenPage(job())).rejects.toThrow("Hidden frame failed");
	expect(
		browser.webRequest.onHeadersReceived.removeListener,
	).toHaveBeenCalledExactlyOnceWith(
		vi.mocked(browser.webRequest.onHeadersReceived.addListener).mock
			.calls[0]?.[0],
	);
	expect(browser.tabs.create).not.toHaveBeenCalled();
	expect(browser.windows.create).not.toHaveBeenCalled();
});
