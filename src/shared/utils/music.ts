import type { ReleaseType } from "../services/types";

export const getReleaseType = (
	title: string | undefined,
	numberOfTracks: number,
): ReleaseType => {
	if (title) {
		if (/\bep\b/i.test(title)) return "ep";
		if (/lp\b/i.test(title)) return "album";
		if (/\bsingle\b/i.test(title)) return "single";
		if (/\bmixtape\b/i.test(title)) return "mixtape";
		if (/\bcompilation\b/i.test(title)) return "compilation";
	}
	if (numberOfTracks <= 3) return "single";
	if (numberOfTracks <= 6) return "ep";
	return "album";
};
