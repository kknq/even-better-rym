import type { ResolveData } from "~/shared/services/types";
import { createSerialQueue } from "~/shared/utils/serial-queue";
import { enqueueCreditEdit } from "./credit-lines";
import { fill } from "./fill";
import { closeShortcutPopup } from "./page-functions";
import { cancelPendingArtistSearch } from "./shortcut-popup";
import type { ReleaseOptions } from "./types";

const enqueueImport = createSerialQueue();

export const importRelease = (
	data: ResolveData,
	options: ReleaseOptions,
): Promise<void> =>
	enqueueImport(async () => {
		document.dispatchEvent(
			new CustomEvent<ResolveData>("importEvent", { detail: data }),
		);
		cancelPendingArtistSearch();
		await closeShortcutPopup();
		// Let in-flight credit edits settle before filling the next release.
		await enqueueCreditEdit(() => Promise.resolve());
		await fill(data, options);
		document.dispatchEvent(
			new CustomEvent("importCompleteEvent", { detail: { data, options } }),
		);
	});
