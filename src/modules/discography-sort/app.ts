import { runScript, waitForDocumentReady } from "~/shared/utils/dom";
import { installDiscographySortPatch } from "./patch";

export async function main(): Promise<void> {
	await waitForDocumentReady();
	if (!document.querySelector('input[id="disco_sort"]')) return;
	await runScript(`(${installDiscographySortPatch.toString()})(window);`);
}
