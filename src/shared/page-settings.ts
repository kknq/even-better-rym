import type { PageKey } from "./pages";
import * as storage from "./utils/storage";

const defaultPageEnabled: Partial<Record<PageKey, boolean>> = {
	hideReviews: false,
	hideCommentBoxes: false,
};

export const getPageEnabled = async (key: PageKey): Promise<boolean> =>
	(await storage.get<boolean>(`pages.${key}`)) ??
	defaultPageEnabled[key] ??
	true;

export const setPageEnabled = async (
	key: PageKey,
	enabled: boolean,
): Promise<void> => storage.set(`pages.${key}`, enabled);

export const runPage = async (key: PageKey, callback: () => unknown) => {
	const enabled = await getPageEnabled(key);
	if (!enabled) return;

	callback();
};
