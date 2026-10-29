import { forceQuerySelector } from "~/shared/utils/dom";

import { openArtistLinkPopup } from "./page-functions";

const SHORTCUT_FRAME_SELECTOR = "#shortcutsearchframe";
const ARTIST_SEARCH_URL = "/go/search2?type=shortcutartist&func=";
const SEARCH_TERM_SELECTOR = "#searchterm";
const ARTIST_RESULT_SELECTOR = '[onclick*="createShortcut"]';
const ARTIST_SHORTCUT_CALL_PATTERN = /createShortcut\(\s*'a'\s*,\s*'(\d+)'/;
const FRAME_LOAD_TIMEOUT_MS = 10_000;
let searchController: AbortController | undefined;

export function cancelPendingArtistSearch(): void {
	searchController?.abort();
}

// Resolves once the frame finishes its next load.
const waitForFrameLoad = (
	frame: HTMLIFrameElement,
	signal?: AbortSignal,
): Promise<boolean> =>
	new Promise((resolve, reject) => {
		const cleanup = () => {
			clearTimeout(timeout);
			frame.removeEventListener("load", loaded);
			signal?.removeEventListener("abort", aborted);
		};
		const loaded = () => {
			cleanup();
			resolve(true);
		};
		const aborted = () => {
			cleanup();
			resolve(false);
		};
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error("Artist search timed out"));
		}, FRAME_LOAD_TIMEOUT_MS);
		frame.addEventListener("load", loaded, { once: true });
		signal?.addEventListener("abort", aborted, { once: true });
		if (signal?.aborted) aborted();
	});

const getShortcutFrame = (): HTMLIFrameElement =>
	forceQuerySelector<HTMLIFrameElement>(document)(SHORTCUT_FRAME_SELECTOR);

// Returns the artist id in a result row's onclick text, if it links an artist.
export const parseArtistResultId = (onclickText: string): string | undefined =>
	ARTIST_SHORTCUT_CALL_PATTERN.exec(onclickText)?.[1];

// Loads a fresh artist search in the popup and submits it for name.
export const prefillArtistSearch = async (
	name: string,
	signal?: AbortSignal,
): Promise<void> => {
	const frame = getShortcutFrame();
	const loaded = waitForFrameLoad(frame, signal);
	frame.src = ARTIST_SEARCH_URL;
	if (!(await loaded)) return;

	const searchInput =
		frame.contentDocument?.querySelector<HTMLInputElement>(
			SEARCH_TERM_SELECTOR,
		);
	if (searchInput?.form == null) {
		throw new Error("Could not find the artist search form");
	}
	searchInput.value = name;
	searchInput.form.submit();
};

// Opens the popup beside the anchor element, searching for name.
export const startArtistSearch = async (
	anchorId: string,
	name: string,
): Promise<void> => {
	searchController?.abort();
	const controller = new AbortController();
	searchController = controller;
	const cancel = (event: CustomEvent<{ targetId?: string }>) => {
		if (event.detail.targetId !== anchorId) controller.abort();
	};
	document.addEventListener("EbrShortcutPopupEvent", cancel);
	try {
		await openArtistLinkPopup(anchorId);
		if (!controller.signal.aborted) {
			await prefillArtistSearch(name, controller.signal);
		}
	} finally {
		document.removeEventListener("EbrShortcutPopupEvent", cancel);
	}
};

// Calls onPick with the artist id of each result clicked in the popup until
// the returned function is called. RYM's own inline onclick handlers on the
// results don't run in Safari, so clicks are read here instead.
export const watchArtistResultClicks = (
	onPick: (assocId: string) => void,
	anchorId: string,
	onCancel: () => void,
): (() => void) => {
	const frame = getShortcutFrame();
	let active = true;
	const handlePopupChange = (event: CustomEvent<{ targetId?: string }>) => {
		if (event.detail.targetId !== anchorId) {
			active = false;
			onCancel();
		}
	};
	const handleClick = (event: MouseEvent) => {
		if (!active) return;
		const row = (event.target as Element | null)?.closest(
			ARTIST_RESULT_SELECTOR,
		);
		const assocId = parseArtistResultId(row?.getAttribute("onclick") ?? "");
		if (assocId === undefined) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		active = false;
		onPick(assocId);
	};
	const attachToDocument = () =>
		frame.contentDocument?.addEventListener("click", handleClick, true);

	attachToDocument();
	document.addEventListener("EbrShortcutPopupEvent", handlePopupChange);
	frame.addEventListener("load", attachToDocument);
	return () => {
		document.removeEventListener("EbrShortcutPopupEvent", handlePopupChange);
		frame.removeEventListener("load", attachToDocument);
		frame.contentDocument?.removeEventListener("click", handleClick, true);
	};
};
