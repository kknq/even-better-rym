import browser from "webextension-polyfill";

const OFFSCREEN_PATH = "src/modules/hidden-page/offscreen.html";
const FRAME_RULE_ID = 17001;

type HiddenPageJob<T> = {
	name: string;
	frameUrlPrefix: string;
	message: { type: string; data: unknown };
	readBackground: () => Promise<T>;
	isResult: (value: unknown) => value is T;
};

async function readOffscreen<T>(job: HiddenPageJob<T>): Promise<T> {
	if (typeof chrome === "undefined" || !chrome.offscreen)
		throw new Error(`This browser does not support invisible ${job.name}`);

	// Scope framing exceptions to extension-owned frames, never ordinary tabs.
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
					urlFilter: `|${job.frameUrlPrefix}`,
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
				justification: `Read ${job.name} without opening a tab or window`,
			});
		const result: unknown = await browser.runtime.sendMessage(job.message);
		if (!job.isResult(result))
			throw new Error(`${job.name} returned an invalid background response`);
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
}

async function readBackgroundPage<T>(job: HiddenPageJob<T>): Promise<T> {
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
			urls: [`${job.frameUrlPrefix}*`],
			types: ["sub_frame"],
		},
		["blocking", "responseHeaders"],
	);
	try {
		return await job.readBackground();
	} finally {
		browser.webRequest.onHeadersReceived.removeListener(onHeaders);
	}
}

// All readers share Chromium's single offscreen document and framing rule.
let queue = Promise.resolve();
export function readHiddenPage<T>(job: HiddenPageJob<T>): Promise<T> {
	const pending = queue.then(() =>
		browser.runtime.getManifest().manifest_version === 2
			? readBackgroundPage(job)
			: readOffscreen(job),
	);
	queue = pending.then(
		() => undefined,
		() => undefined,
	);
	return pending;
}
