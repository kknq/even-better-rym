import { type PageKey, pages } from "./pages";
import * as storage from "./utils/storage";

const modulesDisabledByDefault = new Set<PageKey>([
	"hideReviews",
	"hideCommentBoxes",
]);

export const getModuleEnabled = async (key: PageKey): Promise<boolean> => {
	const enabled = await storage.get<boolean>(`pages.${key}`);
	if (enabled !== undefined) return enabled;

	return !modulesDisabledByDefault.has(key);
};

export const getAllModulesEnabled = async (): Promise<
	Record<PageKey, boolean>
> => {
	const values = await storage.getAll();

	return Object.fromEntries(
		(Object.keys(pages) as PageKey[]).map((key) => {
			const enabled = values[`pages.${key}`];
			if (typeof enabled === "boolean") return [key, enabled];
			return [key, !modulesDisabledByDefault.has(key)];
		}),
	) as Record<PageKey, boolean>;
};

export const setModuleEnabled = async (
	key: PageKey,
	enabled: boolean,
): Promise<void> => storage.set(`pages.${key}`, enabled);

export const runModule = async (key: PageKey, callback: () => unknown) => {
	const enabled = await getModuleEnabled(key);
	if (!enabled) return;

	callback();
};
