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
