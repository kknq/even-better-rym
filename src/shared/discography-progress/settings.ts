import browser from "webextension-polyfill";
import { type ReleaseType, releaseTypes } from "~/shared/release-types";
import * as storage from "~/shared/utils/storage";

const key = "discography-progress.types";
const hideZeroCoverageKey = "discography-progress.hide-zero-coverage";
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
	return watchSetting(key, parseSelectedTypes, callback);
}

export async function getHideZeroCoverage(): Promise<boolean> {
	return (await storage.get<unknown>(hideZeroCoverageKey)) === true;
}

export function setHideZeroCoverage(hide: boolean): Promise<void> {
	return storage.set(hideZeroCoverageKey, hide);
}

export function watchHideZeroCoverage(
	callback: (hide: boolean) => void,
): () => void {
	return watchSetting(hideZeroCoverageKey, (value) => value === true, callback);
}

function watchSetting<T>(
	settingKey: string,
	parse: (value: unknown) => T,
	callback: (value: T) => void,
): () => void {
	const listener = (
		changes: Record<string, browser.Storage.StorageChange>,
		area: string,
	) => {
		if (area === "local" && settingKey in changes) {
			callback(parse(changes[settingKey].newValue));
		}
	};
	browser.storage.onChanged.addListener(listener);
	return () => browser.storage.onChanged.removeListener(listener);
}
