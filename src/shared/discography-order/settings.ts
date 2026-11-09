import browser from "webextension-polyfill";
import type { ReleaseType } from "~/shared/release-types";
import * as storage from "~/shared/utils/storage";
import { parseSectionOrder, sectionOrderKey } from "./order";

export {
	defaultSectionOrder,
	isDefaultSectionOrder,
	parseSectionOrder,
} from "./order";

const key = sectionOrderKey;

export async function getSectionOrder(): Promise<ReleaseType[]> {
	return parseSectionOrder(await storage.get<unknown>(key));
}

export function setSectionOrder(order: readonly ReleaseType[]): Promise<void> {
	return storage.set(key, [...order]);
}

export function resetSectionOrder(): Promise<void> {
	return storage.remove(key);
}

export function watchSectionOrder(
	callback: (order: ReleaseType[]) => void,
): () => void {
	const listener = (
		changes: Record<string, browser.Storage.StorageChange>,
		area: string,
	) => {
		if (area === "local" && key in changes) {
			callback(parseSectionOrder(changes[key].newValue));
		}
	};
	browser.storage.onChanged.addListener(listener);
	return () => browser.storage.onChanged.removeListener(listener);
}
