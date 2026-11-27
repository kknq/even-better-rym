import { readHiddenTidalCredits } from "~/modules/tidal-credits/hidden-credits";
import {
	isTidalCreditsInput,
	isTidalCreditsResult,
} from "~/shared/services/tidal/credits-page";
import type {
	TidalCreditsRequest,
	TidalCreditsResponse,
} from "~/shared/utils/messaging";
import { readHiddenPage } from "./hidden-page";

export async function tidalCredits({
	id,
	data,
}: TidalCreditsRequest): Promise<TidalCreditsResponse> {
	try {
		if (!isTidalCreditsInput(data))
			throw new Error("Invalid Tidal credits request");
		const result = await readHiddenPage({
			name: "Tidal credits",
			frameUrlPrefix: "https://tidal.com/album/",
			message: { type: "ebr-tidal-offscreen", data },
			readBackground: () => readHiddenTidalCredits(data),
			isResult: isTidalCreditsResult,
			prepareOffscreen: async () => {
				if (!chrome.browsingData?.remove) {
					console.warn(
						"EvenBetterRYM: Tidal service worker removal is unavailable; continuing with credits import",
					);
					return;
				}
				try {
					await chrome.browsingData.remove(
						{ origins: ["https://tidal.com"] },
						{ serviceWorkers: true },
					);
				} catch (error) {
					console.warn(
						"EvenBetterRYM: could not remove Tidal service workers; continuing with credits import",
						error,
					);
				}
			},
		});
		return { id, type: "tidalCredits", data: result };
	} catch (error) {
		console.warn("EvenBetterRYM: could not read Tidal credits", error);
		return {
			id,
			type: "tidalCredits",
			data: { error: error instanceof Error ? error.message : String(error) },
		};
	}
}
