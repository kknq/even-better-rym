import type { FetchRequest, FetchResponse } from "./messaging";
import { sendBackgroundMessage } from "./messaging";

export const fetch = async (data: FetchRequest["data"]): Promise<string> => {
	const response = await sendBackgroundMessage<FetchRequest, FetchResponse>({
		type: "fetch",
		data,
	});
	if (response.data.error) throw new Error(response.data.error);
	return response.data.body;
};

/**
 * Perform a `fetch` from the page's main world instead of the background
 * script. This is useful when you need the request to run with the page's
 * cookies, CSP, or any other context that the background fetch doesn't share.
 *
 * The helper injects a tiny script into the page which does the network call
 * and posts the result back via `window.postMessage`.
 */
export const fetchInPage = async (
	data: FetchRequest["data"],
	options: { cache?: RequestCache; timeoutMs?: number } = {},
): Promise<string> => {
	const requestId = crypto.randomUUID();
	const origin = globalThis.location.origin;

	return new Promise<string>((resolve, reject) => {
		const cleanup = () => {
			window.removeEventListener("message", listener);
			clearTimeout(timeout);
		};
		const listener = (
			event: MessageEvent<{
				type: string;
				id: string;
				body: string;
				error?: string;
			}>,
		) => {
			if (
				event.source === window &&
				event.origin === origin &&
				event.data?.type === "PAGE_FETCH_RESULT" &&
				event.data.id === requestId
			) {
				cleanup();
				if (event.data.error) reject(new Error(event.data.error));
				else resolve(event.data.body);
			}
		};

		window.addEventListener("message", listener);
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error("Page fetch timed out"));
		}, options.timeoutMs ?? 30_000);

		/**
		 * Serialize the request parameters so they survive injection;
		 * base64-encode the serialized object so that no characters can
		 * accidentally terminate the outer template string or introduce
		 * unbalanced parentheses when the script is injected into the page.
		 *
		 * Normal `btoa` throws when the string contains non-latin characters,
		 * which happens if the user’s preferences include emoji or accented
		 * letters.  Wrap it to handle arbitrary Unicode.
		 */
		const unicodeBase64 = (str: string) => {
			const bytes = new TextEncoder().encode(str);
			let binary = "";
			for (const byte of bytes) binary += String.fromCodePoint(byte);
			return btoa(binary);
		};
		const serialized = unicodeBase64(JSON.stringify({ ...data, ...options }));
		void sendBackgroundMessage({
			type: "script",
			data: {
				// the injected script runs in the page's main world
				script: `;(async () => {
          const controller = new AbortController();
          let timeout;
          try {
            // decode using the reverse of unicodeBase64()
            const req = JSON.parse(decodeURIComponent(escape(atob("${serialized}"))));
            timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 30000);
            const u = new URL(req.url);
            if (req.urlParameters) {
              for (const [k,v] of Object.entries(req.urlParameters)) {
                if (v != null) u.searchParams.append(k, v);
              }
            }
            const res = await fetch(u.toString(), {
              method: req.method,
              body: req.body,
              headers: req.headers,
              credentials: req.credentials,
              cache: req.cache,
              signal: controller.signal,
            });
            if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + res.statusText);
            const body = await res.text();
            window.postMessage({
              type: 'PAGE_FETCH_RESULT',
              id: ${JSON.stringify(requestId)},
              body,
            }, window.location.origin);
          } catch (e) {
            window.postMessage({
              type: 'PAGE_FETCH_RESULT',
              id: ${JSON.stringify(requestId)},
              body: '',
              error: e instanceof Error ? e.message : String(e),
            }, window.location.origin);
          } finally {
            clearTimeout(timeout);
          }
        })();`,
			},
		}).catch((error: unknown) => {
			cleanup();
			reject(error instanceof Error ? error : new Error(String(error)));
		});
	});
};
