import { useEffect, useState } from "preact/hooks";
import browser from "webextension-polyfill";

import {
	type CollectionKind,
	type CollectionSettings,
	collectionSettingsKey,
	getCollectionSettings,
	setCollectionSettings,
} from "./settings";

export function useCollectionSettings(kind: CollectionKind) {
	const [settings, setSettings] = useState<CollectionSettings | null>(null);
	const [error, setError] = useState("");
	useEffect(() => {
		const load = () => {
			void getCollectionSettings(kind)
				.then(setSettings)
				.catch((reason: unknown) => {
					setError(String(reason));
				});
		};
		const changed = (
			changes: Record<string, browser.Storage.StorageChange>,
			area: string,
		) => {
			const change = changes[collectionSettingsKey(kind)];
			if (area === "local" && change) {
				load();
			}
		};
		browser.storage.onChanged.addListener(changed);
		load();
		return () => browser.storage.onChanged.removeListener(changed);
	}, [kind]);

	const save = async (next: CollectionSettings) => {
		setError("");
		try {
			await setCollectionSettings(kind, next);
			setSettings(next);
		} catch (reason) {
			setError(`Could not save collection settings: ${String(reason)}`);
			throw reason;
		}
	};
	return { settings, save, error };
}
