import { runScript } from "~/shared/utils/dom";

const CREATE_SHORTCUT_PATCH_ATTEMPTS = 20;
const CREATE_SHORTCUT_PATCH_INTERVAL_MS = 200;
const UNLINKED_CREDIT_ID = "XXX";

// A credit for an artist, linked by RYM id or written as plain text when it
// has none, with its role and tracks fields.
export type ArtistCredit = {
	id: string | undefined;
	name: string;
	role: string;
	tracks: string;
};

export const selectShortcut = (
	type: string,
	id: number,
	name: string,
	target: string,
	label = "",
): Promise<void> =>
	runScript(
		`selectShortcut(${JSON.stringify(type)}, ${id}, ${JSON.stringify(name)}, ${JSON.stringify(target)}, ${JSON.stringify(label)})`,
	);

// window.parent.goInfobox(897)
export const goInfobox = (id: number): Promise<void> =>
	runScript(`goInfobox(${id})`);

// Opens RYM's "Insert link" popup beside anchorId.
export const openArtistLinkPopup = (anchorId: string): void =>
	void runScript(
		`openShortcut(document.getElementById(${JSON.stringify(anchorId)}));`,
	);

// Closes RYM's "Insert link" popup.
export const closeShortcutPopup = (): void => void runScript("closeShortcut()");

// Adds a credit line for the artist, filled with the role and tracks. An
// unlinked artist goes in as RYM's manual line, with the name typed in.
export const addArtistCredit = (credit: ArtistCredit): Promise<void> => {
	const typeUnlinkedName =
		credit.id === undefined
			? `document.getElementById('credits_artist_' + credits_num).value = ${JSON.stringify(credit.name)};`
			: "";
	return runScript(`
		addCredit('a', ${JSON.stringify(credit.id ?? UNLINKED_CREDIT_ID)}, ${JSON.stringify(credit.name)});
		${typeUnlinkedName}
		document.getElementById('credits_roles_' + credits_num).value = ${JSON.stringify(credit.role)};
		document.getElementById('credits_tracks_' + credits_num).value = ${JSON.stringify(credit.tracks)};
	`);
};

// Removes the numbered credit line.
export const deleteCreditLine = (line: string): Promise<void> =>
	runScript(`deleteCredit(${JSON.stringify(line)})`);

// Switches RYM's tracklist editor to its advanced (text) mode.
export const showAdvancedTracklist = (): Promise<void> =>
	runScript(`document.querySelector('#goAdvancedBtn').click()`);

// Switches RYM's tracklist editor back to its simple (per-row) mode.
export const showSimpleTracklist = (): Promise<void> =>
	runScript(`document.querySelector('#goSimpleBtn').click()`);

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
