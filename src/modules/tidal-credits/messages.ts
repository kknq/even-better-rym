import type { TidalCreditsInput } from "~/shared/services/tidal/credits-page";
import { isTidalCreditsInput } from "~/shared/services/tidal/credits-page";

export type FrameRequest = {
	type: "ebr-tidal-read-credits";
	id: string;
	data: TidalCreditsInput;
};

export const isFrameRequest = (value: unknown): value is FrameRequest =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "ebr-tidal-read-credits" &&
	"id" in value &&
	typeof value.id === "string" &&
	"data" in value &&
	isTidalCreditsInput(value.data);
