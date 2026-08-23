import { runScript } from "~/shared/utils/dom";

const CREATE_SHORTCUT_PATCH_ATTEMPTS = 20;
const CREATE_SHORTCUT_PATCH_INTERVAL_MS = 200;

export const selectShortcut = (
	type: string,
	id: number,
	name: string,
	target: string,
): void =>
	void runScript(
		`selectShortcut(\`${type}\`, ${id}, \`${name}\`, \`${target}\`)`,
	);

// window.parent.goInfobox(897)
export const goInfobox = (id: number): void =>
	void runScript(`goInfobox(${id})`);

// window.currentElement isn't visible to the content script's isolated
// world, so window.createShortcut has to be wrapped from injected page-world
// code; it polls because this content script runs at document_start, before
// the page's own inline script (which defines createShortcut) has executed.
export const patchCreateShortcut = (): void =>
	void runScript(`
		(function () {
			var attempts = 0;
			var interval = setInterval(function () {
				attempts += 1;
				if (attempts > ${CREATE_SHORTCUT_PATCH_ATTEMPTS}) {
					clearInterval(interval);
					return;
				}
				if (typeof window.createShortcut !== "function") return;
				clearInterval(interval);

				var original = window.createShortcut;
				window.createShortcut = function (type, assocId, text) {
					var target = window.currentElement;
					var previousValue = target ? target.value : undefined;
					var result = original.apply(window, arguments);
					if (target) {
						document.dispatchEvent(new CustomEvent("EbrArtistShortcutInsertedEvent", {
							detail: {
								type: type,
								assocId: String(assocId),
								text: text,
								targetId: target.id,
								previousValue: previousValue
							}
						}));
					}
					return result;
				};
			}, ${CREATE_SHORTCUT_PATCH_INTERVAL_MS});
		})();
	`);
