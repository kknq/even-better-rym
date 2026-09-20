import browser from "webextension-polyfill";

import { getPageEnabled } from "~/shared/page-settings";
import type { PageKey } from "~/shared/pages";
import { globalPageKeys, pages } from "~/shared/pages";
import type {
	BackgroundResponse,
	KeybindingsUpdatedMessage,
} from "~/shared/utils/messaging";
import {
	isBackgroundRequest,
	isKeybindingsChangedMessage,
} from "~/shared/utils/messaging";

import { download } from "./download";
import { backgroundFetch } from "./fetch";
import { script } from "./script";

const CHART_PAGE_PATTERN = "*://*.rateyourmusic.com/charts/*";
const CHANGELOG_PATH = "changelog.html";

browser.runtime.onInstalled.addListener((details) => {
	if (details.reason !== "update") return;

	void browser.tabs.create({
		url: browser.runtime.getURL(CHANGELOG_PATH),
	});
});

const getResponse = (
	message: unknown,
	tabId: number,
): Promise<BackgroundResponse> => {
	if (isBackgroundRequest(message)) {
		if (message.type === "fetch") return backgroundFetch(message);
		if (message.type === "download") return download(message);
		if (message.type === "script") return script(message, tabId);
	}
	throw new Error(`Invalid message: ${JSON.stringify(message)}`);
};

// Notifies any already-open chart page so a rebind made in the popup takes
// effect without a refresh.
const broadcastKeybindingsChanged = async (value: string): Promise<void> => {
	const tabs = await browser.tabs.query({ url: CHART_PAGE_PATTERN });
	await Promise.all(
		tabs
			.filter((tab): tab is typeof tab & { id: number } => tab.id != null)
			.map((tab) =>
				browser.tabs.sendMessage(tab.id, {
					type: "keybindingsUpdated",
					data: { value },
				} satisfies KeybindingsUpdatedMessage),
			),
	);
};

browser.runtime.onMessage.addListener((message, sender) => {
	if (isKeybindingsChangedMessage(message)) {
		void broadcastKeybindingsChanged(message.data.value);
		return undefined;
	}

	const tabId = sender.tab?.id;
	if (tabId === undefined) return undefined;

	void getResponse(message, tabId).then((response) =>
		browser.tabs.sendMessage(tabId, response),
	);
});

const setTabIcon = (tabId: number, enabled: boolean) => {
	void browser.action.setIcon({
		tabId,
		path: enabled
			? {
					"19": browser.runtime.getURL("icons/extension-enabled-19.png"),
					"38": browser.runtime.getURL("icons/extension-enabled-38.png"),
				}
			: {
					"19": browser.runtime.getURL("icons/extension-disabled-19.png"),
					"38": browser.runtime.getURL("icons/extension-disabled-38.png"),
				},
	});
	void browser.action.setTitle({
		tabId,
		title: `EvenBetterRYM ${enabled ? "enabled" : "disabled"}`,
	});
};

browser.tabs.onUpdated.addListener((id, _changeInfo, tab) => {
	if (!tab.url) return;
	const url = new URL(tab.url);
	if (!url.hostname.endsWith("rateyourmusic.com")) return;

	const pageEntries = (Object.entries(pages) as [PageKey, string][]).filter(
		([key]) => !globalPageKeys.has(key),
	);

	const matchingKeys = pageEntries
		.filter(([, pageUrl]) => url.pathname.startsWith(pageUrl))
		.map(([key]) => key);

	if (matchingKeys.length === 0) return;

	void Promise.all(matchingKeys.map((key) => getPageEnabled(key))).then(
		(results) => {
			const enabled = results.some(Boolean);
			setTabIcon(id, enabled);
			void browser.action.enable(id);
		},
	);
});
