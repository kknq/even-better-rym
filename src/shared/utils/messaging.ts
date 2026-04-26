import { nanoid } from "nanoid";
import browser from "webextension-polyfill";

export type FetchRequest = {
	id: string;
	type: "fetch";
	data: {
		url: string;
		method?: "GET" | "POST";
		urlParameters?: Record<string, string>;
		headers?: Record<string, string>;
		credentials?: RequestCredentials;
	};
};

export type FetchResponse = {
	id: string;
	type: "fetch";
	data: {
		body: string;
	};
};

export type DownloadRequest = {
	id: string;
	type: "download";
	data: {
		url: string;
		filename: string;
	}[];
};

export type DownloadResponse = {
	id: string;
	type: "download";
	data: {
		id: number;
	};
};

export type ScriptRequest = {
	id: string;
	type: "script";
	data: {
		script: string;
	};
};

export type ScriptResponse = {
	id: string;
	type: "script";
};

export type BackgroundRequest = FetchRequest | DownloadRequest | ScriptRequest;
export type BackgroundResponse =
	| FetchResponse
	| DownloadResponse
	| ScriptResponse;

export const isBackgroundRequest = (o: unknown): o is BackgroundRequest =>
	typeof o === "object" && o !== null && "id" in o && "type" in o;
export const isBackgroundResponse = (o: unknown): o is BackgroundResponse =>
	typeof o === "object" && o !== null && "id" in o && "type" in o;

export const sendBackgroundMessage = <
	Request extends BackgroundRequest,
	Response extends BackgroundResponse,
>(
	request: Omit<Request, "id">,
): Promise<Response> =>
	new Promise((resolve) => {
		const requestId = nanoid();

		const onResponse = (response: unknown): undefined => {
			if (isBackgroundResponse(response) && response.id === requestId) {
				resolve(response as Response);
				browser.runtime.onMessage.removeListener(onResponse);
			}
		};

		browser.runtime.onMessage.addListener(onResponse);
		void browser.runtime.sendMessage({ id: requestId, ...request });
	});
