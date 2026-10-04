import type { ReleaseType } from "~/shared/services/types";

export const getReleaseTypeFromPath = (
	pathname: string,
): ReleaseType | undefined => {
	const type = pathname.split("/")[2];
	switch (type) {
		case "single":
			return "single";
		case "musicvideo":
			return "music video";
		default:
			return undefined;
	}
};
