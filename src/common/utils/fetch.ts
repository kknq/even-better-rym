import { sendBackgroundMessage } from './messaging'
import type { FetchRequest, FetchResponse } from './messaging/codec'

export const fetch = async (data: FetchRequest['data']): Promise<string> => {
  const response = await sendBackgroundMessage<FetchRequest, FetchResponse>({
    type: 'fetch',
    data,
  })
  return response.data.body
}

/**
 * Perform a `fetch` from the page's main world instead of the background
 * script. This is useful when you need the request to run with the page's
 * cookies, CSP, or any other context that the background fetch doesn't share.
 *
 * The helper injects a tiny script into the page which does the network call
 * and posts the result back via `window.postMessage`.
 */
export const fetchInPage = async (
  data: FetchRequest['data'],
): Promise<string> => {
  const requestId = crypto.randomUUID()

  return new Promise<string>((resolve) => {
    const listener = (event: MessageEvent) => {
      if (
        event.source === window &&
        event.data?.type === 'PAGE_FETCH_RESULT' &&
        event.data.id === requestId
      ) {
        window.removeEventListener('message', listener)
        resolve(event.data.body)
      }
    }

    window.addEventListener('message', listener)

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
    const unicodeBase64 = (str: string) =>
      btoa(unescape(encodeURIComponent(str)))
    const serialized = unicodeBase64(JSON.stringify(data))
    void sendBackgroundMessage({
      type: 'script',
      data: {
        // the injected script runs in the page's main world
        script: `;(async () => {
          try {
            // decode using the reverse of unicodeBase64()
            const req = JSON.parse(decodeURIComponent(escape(atob("${serialized}"))));
            const u = new URL(req.url);
            if (req.urlParameters) {
              for (const [k,v] of Object.entries(req.urlParameters))
                u.searchParams.append(k, v);
            }
            const res = await fetch(u.toString(), {
              method: req.method,
              headers: req.headers,
              credentials: req.credentials,
            });
            const body = await res.text();
            window.postMessage({
              type: 'PAGE_FETCH_RESULT',
              id: ${JSON.stringify(requestId)},
              body,
            }, '*');
          } catch (e) {
            window.postMessage({
              type: 'PAGE_FETCH_RESULT',
              id: ${JSON.stringify(requestId)},
              body: '',
            }, '*');
          }
        })();`,
      },
    })
  })
}
