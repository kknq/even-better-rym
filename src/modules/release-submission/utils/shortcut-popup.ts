import { forceQuerySelector } from "~/shared/utils/dom";

const SHORTCUT_FRAME_SELECTOR = "#shortcutsearchframe";
const ARTIST_SEARCH_URL = "/go/search2?type=shortcutartist&func=";
const SEARCH_TERM_SELECTOR = "#searchterm";
const ARTIST_RESULT_SELECTOR = '[onclick*="createShortcut"]';
const ARTIST_SHORTCUT_CALL_PATTERN = /createShortcut\(\s*'a'\s*,\s*'(\d+)'/;

// Resolves once the frame finishes its next load.
const waitForFrameLoad = (frame: HTMLIFrameElement): Promise<void> =>
	new Promise((resolve) => {
		frame.addEventListener("load", () => resolve(), { once: true });
	});

const getShortcutFrame = (): HTMLIFrameElement =>
	forceQuerySelector<HTMLIFrameElement>(document)(SHORTCUT_FRAME_SELECTOR);

// Returns the artist id in a result row's onclick text, if it links an artist.
export const parseArtistResultId = (onclickText: string): string | undefined =>
	ARTIST_SHORTCUT_CALL_PATTERN.exec(onclickText)?.[1];

// Loads a fresh artist search in the popup and submits it for name.
export const prefillArtistSearch = async (name: string): Promise<void> => {
	const frame = getShortcutFrame();
	const loaded = waitForFrameLoad(frame);
	frame.src = ARTIST_SEARCH_URL;
	await loaded;

	const searchInput =
		frame.contentDocument?.querySelector<HTMLInputElement>(
			SEARCH_TERM_SELECTOR,
		);
	if (searchInput?.form == null) {
		return;
	}
	searchInput.value = name;
	searchInput.form.submit();
};

// Calls onPick with the artist id of each result clicked in the popup until
// the returned function is called. RYM's own inline onclick handlers on the
// results don't run in Safari, so clicks are read here instead.
export const watchArtistResultClicks = (
	onPick: (assocId: string) => void,
): (() => void) => {
	const frame = getShortcutFrame();
	const handleClick = (event: MouseEvent) => {
		const row = (event.target as Element | null)?.closest(
			ARTIST_RESULT_SELECTOR,
		);
		const assocId = parseArtistResultId(row?.getAttribute("onclick") ?? "");
		if (assocId === undefined) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		onPick(assocId);
	};
	const attachToDocument = () =>
		frame.contentDocument?.addEventListener("click", handleClick, true);

	attachToDocument();
	frame.addEventListener("load", attachToDocument);
	return () => {
		frame.removeEventListener("load", attachToDocument);
		frame.contentDocument?.removeEventListener("click", handleClick, true);
	};
};
