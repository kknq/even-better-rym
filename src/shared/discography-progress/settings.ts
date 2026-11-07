import browser from "webextension-polyfill";
import { type ReleaseType, releaseTypes } from "~/shared/release-types";
import * as storage from "~/shared/utils/storage";

const key = "discography-progress.types";
export const defaultSelectedTypes: readonly ReleaseType[] = ["s", "e", "m"];

function parseSelectedTypes(stored: unknown): Set<ReleaseType> {
	return new Set(
		(Object.keys(releaseTypes) as ReleaseType[]).filter((type) =>
			Array.isArray(stored)
				? stored.includes(type)
				: defaultSelectedTypes.includes(type),
		),
	);
}

export async function getSelectedTypes(): Promise<Set<ReleaseType>> {
	return parseSelectedTypes(await storage.get<unknown>(key));
}

export function setSelectedTypes(types: Set<ReleaseType>): Promise<void> {
	return storage.set(key, [...types]);
}

export function watchSelectedTypes(
	callback: (selected: Set<ReleaseType>) => void,
): () => void {
	const listener = (
		changes: Record<string, browser.Storage.StorageChange>,
		area: string,
	) => {
		if (area === "local" && key in changes) {
			callback(parseSelectedTypes(changes[key].newValue));
		}
	};
	browser.storage.onChanged.addListener(listener);
	return () => browser.storage.onChanged.removeListener(listener);
}
