import { type PageKey, pages } from "./pages";
import * as storage from "./utils/storage";

const defaultPageEnabled: Partial<Record<PageKey, boolean>> = {
	hideReviews: false,
	hideCommentBoxes: false,
	discogsCarousel: true,
	referenceLinks: true,
	wikipedia: true,
	userReception: true,
};

const legacyGenreChartControlKeys = [
	"filmChartGenreLinks",
	"filmGenreChartButton",
	"genrePageChartControls",
] as const;

const legacyReferenceLinkKeys = ["whosampled"] as const;

const getLegacyGenreChartControlsEnabled = (
	values: Record<string, unknown>,
): boolean =>
	legacyGenreChartControlKeys.every((key) => values[`pages.${key}`] !== false);

const getLegacyReferenceLinksEnabled = (
	values: Record<string, unknown>,
): boolean =>
	legacyReferenceLinkKeys.every((key) => values[`pages.${key}`] !== false);

export const getPageEnabled = async (key: PageKey): Promise<boolean> => {
	const enabled = await storage.get<boolean>(`pages.${key}`);
	if (enabled !== undefined) return enabled;

	if (key === "genreChartControls") {
		return getLegacyGenreChartControlsEnabled(await storage.getAll());
	}
	if (key === "referenceLinks") {
		const values = await storage.getAll();
		const enabled = values["pages.referenceLinks"];
		return typeof enabled === "boolean"
			? enabled
			: getLegacyReferenceLinksEnabled(values);
	}
	if (key === "wikipedia") {
		return (await storage.getAll())["pages.wikipedia"] !== false;
	}

	return defaultPageEnabled[key] ?? true;
};

export const getAllPageEnabled = async (): Promise<
	Record<PageKey, boolean>
> => {
	const values = await storage.getAll();

	return Object.fromEntries(
		(Object.keys(pages) as PageKey[]).map((key) => {
			const enabled = values[`pages.${key}`];
			if (typeof enabled === "boolean") return [key, enabled];
			if (key === "genreChartControls") {
				return [key, getLegacyGenreChartControlsEnabled(values)];
			}
			if (key === "referenceLinks") {
				const enabled = values["pages.referenceLinks"];
				return [
					key,
					typeof enabled === "boolean"
						? enabled
						: getLegacyReferenceLinksEnabled(values),
				];
			}
			if (key === "wikipedia") {
				return [key, values["pages.wikipedia"] !== false];
			}
			return [key, defaultPageEnabled[key] ?? true];
		}),
	) as Record<PageKey, boolean>;
};

export const setPageEnabled = async (
	key: PageKey,
	enabled: boolean,
): Promise<void> => storage.set(`pages.${key}`, enabled);

export const runPage = async (key: PageKey, callback: () => unknown) => {
	const enabled = await getPageEnabled(key);
	if (!enabled) return;

	callback();
};
