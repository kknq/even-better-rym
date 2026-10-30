import type {
	TidalCreditsInput,
	TidalCreditsResult,
} from "~/shared/services/tidal/credits-page";
import { isTidalCreditsResult } from "~/shared/services/tidal/credits-page";
import type { FrameRequest } from "./messages";

export function readHiddenTidalCredits(
	data: TidalCreditsInput,
): Promise<TidalCreditsResult> {
	return new Promise((resolve) => {
		const frame = document.createElement("iframe");
		const id = crypto.randomUUID();
		frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
		frame.style.cssText = "width:1280px;height:900px;border:0";
		frame.src = `https://tidal.com/album/${data.albumId}/credits`;
		const finish = (result: TidalCreditsResult) => {
			clearTimeout(timeout);
			window.removeEventListener("message", onMessage);
			frame.remove();
			resolve(result);
		};
		const onMessage = (event: MessageEvent<unknown>) => {
			if (
				event.source !== frame.contentWindow ||
				event.origin !== "https://tidal.com" ||
				typeof event.data !== "object" ||
				event.data === null ||
				!("type" in event.data)
			)
				return;
			if (event.data.type === "ebr-tidal-ready") {
				frame.contentWindow?.postMessage(
					{ type: "ebr-tidal-read-credits", id, data } satisfies FrameRequest,
					"https://tidal.com",
				);
			} else if (
				event.data.type === "ebr-tidal-result" &&
				"id" in event.data &&
				event.data.id === id
			) {
				finish(
					"result" in event.data && isTidalCreditsResult(event.data.result)
						? event.data.result
						: { error: "Invalid Tidal credits frame response" },
				);
			}
		};
		const timeout = setTimeout(
			() => finish({ error: "Invisible Tidal credits page did not respond" }),
			35_000,
		);
		frame.onerror = () =>
			finish({ error: "Invisible Tidal credits page did not load" });
		window.addEventListener("message", onMessage);
		document.body.append(frame);
	});
}
