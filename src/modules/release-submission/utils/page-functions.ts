import { runScript } from "~/shared/utils/dom";
import { buildArtistToken } from "./artist-shortcuts";
import { reportSubmissionError } from "./report-error";

const CREATE_SHORTCUT_PATCH_ATTEMPTS = 20;
const CREATE_SHORTCUT_PATCH_INTERVAL_MS = 200;
const UNLINKED_CREDIT_ID = "XXX";

// A credit for an artist, linked by RYM id or written as plain text when it
// has none, with its role and tracks fields.
export type ArtistCredit = {
	id: string | undefined;
	name: string;
	creditedName?: string;
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
export const openArtistLinkPopup = (anchorId: string): Promise<void> =>
	runScript(
		`openShortcut(document.getElementById(${JSON.stringify(anchorId)}));`,
	);

// Closes RYM's "Insert link" popup.
export const closeShortcutPopup = (): Promise<void> =>
	runScript("closeShortcut()");

export const attachCreditRoleSuggestions = (fieldId: string): Promise<void> =>
	runScript(`
		(function () {
			if (typeof window.roleattachSuggest !== "function" ||
				typeof window.rolechooseSuggestion !== "function") {
				throw new Error("RYM credit role suggestions are unavailable");
			}
			if (!window.rolechooseSuggestion.ebrWrapped) {
				var original = window.rolechooseSuggestion;
				var wrapped = function () {
					var input = window.roleinputEl;
					var result = original.apply(this, arguments);
					if (input && input.hasAttribute("data-ebr-credit-role")) {
						input.dispatchEvent(new Event("input", { bubbles: true }));
						input.dispatchEvent(new Event("change", { bubbles: true }));
					}
					return result;
				};
				wrapped.ebrWrapped = true;
				window.rolechooseSuggestion = wrapped;
			}
			window.roleattachSuggest(${JSON.stringify(fieldId)});
		})();
	`);

export const updateCreditDetails = (
	line: string,
	role: string,
	tracks: string,
	artist?: string,
): Promise<void> =>
	runScript(`
		(function () {
			var role = document.getElementById(${JSON.stringify(`credits_roles_${line}`)});
			var tracks = document.getElementById(${JSON.stringify(`credits_tracks_${line}`)});
			if (!role || !tracks) throw new Error("Could not find the credit fields");
			${
				artist === undefined
					? ""
					: `
				var artist = document.getElementById(${JSON.stringify(`credits_artist_${line}`)});
				if (!artist) throw new Error("Could not find the credit artist field");
				artist.value = ${JSON.stringify(artist)};
				updateArtistPreview(${JSON.stringify(line)}, 'credits');
				artist.dispatchEvent(new Event("change", { bubbles: true }));
			`
			}
			role.value = ${JSON.stringify(role)};
			tracks.value = ${JSON.stringify(tracks)};
			role.dispatchEvent(new Event("change", { bubbles: true }));
			tracks.dispatchEvent(new Event("change", { bubbles: true }));
		})();
	`);

// Adds a credit line for the artist, filled with the role and tracks. An
// unlinked artist goes in as RYM's manual line, with the name typed in.
export const addArtistCredit = (credit: ArtistCredit): Promise<void> => {
	const typeUnlinkedName =
		credit.id === undefined
			? `
				document.getElementById('credits_artist_' + credits_num).value = ${JSON.stringify(credit.name)};
				updateArtistPreview(credits_num, 'credits');
			`
			: "";
	const typeCreditedName =
		credit.id !== undefined && credit.creditedName !== undefined
			? `
				document.getElementById('credits_artist_' + credits_num).value = ${JSON.stringify(buildArtistToken(credit.id, credit.creditedName))};
				updateArtistPreview(credits_num, 'credits');
			`
			: "";
	return runScript(`
		addCredit('a', ${JSON.stringify(credit.id ?? UNLINKED_CREDIT_ID)}, ${JSON.stringify(credit.name)});
		${typeUnlinkedName}
		${typeCreditedName}
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
				if (typeof window.createShortcut !== "function" ||
					typeof window.openShortcut !== "function" ||
					typeof window.closeShortcut !== "function") return;
				clearInterval(interval);

				var original = window.createShortcut;
				var originalOpen = window.openShortcut;
				window.openShortcut = function (target) {
					var result = originalOpen.apply(window, arguments);
					document.dispatchEvent(new CustomEvent("EbrShortcutPopupEvent", {
						detail: { targetId: target ? target.id : undefined }
					}));
					return result;
				};
				var originalClose = window.closeShortcut;
				window.closeShortcut = function () {
					var result = originalClose.apply(window, arguments);
					document.dispatchEvent(new CustomEvent("EbrShortcutPopupEvent", {
						detail: {}
					}));
					return result;
				};
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
	`).catch(reportSubmissionError);
