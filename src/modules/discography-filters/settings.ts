import browser from "webextension-polyfill";
import * as storage from "~/shared/utils/storage";

export const filterKeys = {
	soundtracks: "discography-filters.hide-soundtracks",
	remixes: "discography-filters.hide-remixes",
	archival: "discography-filters.hide-archival",
} as const;

export type Filter = keyof typeof filterKeys;

export async function getFilter(filter: Filter): Promise<boolean> {
	return (await storage.get<unknown>(filterKeys[filter])) === true;
}

export function setFilter(filter: Filter, enabled: boolean): Promise<void> {
	return storage.set(filterKeys[filter], enabled);
}

export function watchFilters(
	callback: (filter: Filter, enabled: boolean) => void,
): () => void {
	const listener = (
		changes: Record<string, browser.Storage.StorageChange>,
		area: string,
	) => {
		if (area !== "local") return;
		for (const filter of Object.keys(filterKeys) as Filter[]) {
			const key = filterKeys[filter];
			if (key in changes) callback(filter, changes[key].newValue === true);
		}
	};
	browser.storage.onChanged.addListener(listener);
	return () => browser.storage.onChanged.removeListener(listener);
}
