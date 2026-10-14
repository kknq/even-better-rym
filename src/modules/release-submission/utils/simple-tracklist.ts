import { forceQuerySelector } from "~/shared/utils/dom";
import { createSerialQueue } from "~/shared/utils/serial-queue";

import { showAdvancedTracklist, showSimpleTracklist } from "./page-functions";
import type { TrackKey } from "./track-artist-links";
import {
	getChangedTitles,
	getTrackKeys,
	TRACKLIST_FIELD_SEPARATOR,
	TRACKLIST_LINE_SEPARATOR,
} from "./track-artist-links";

const SIMPLE_SELECTOR = "#tracks_simp";
const ADVANCED_SELECTOR = "#tracks_adv";
const ADVANCED_INPUT_SELECTOR = "#track_advanced";
const ROW_TEMPLATE_SELECTOR = "#track_base";
const ROW_SELECTOR = 'tr[id^="track_"]:not(#track_base)';
const NUMBER_INPUT_SELECTOR = 'input[id^="track_track_number"]';
const TITLE_INPUT_SELECTOR = 'input[id^="track_track_title"]';
const LENGTH_INPUT_SELECTOR = 'input[id^="track_track_length"]';
const RESET_SLOT_CLASS = "ebr-track-reset";
// Places the reset slot just past the time cell's right edge, outside the
// table, centred on the row.
const RESET_SLOT_STYLE: Partial<CSSStyleDeclaration> = {
	position: "absolute",
	left: "100%",
	top: "50%",
	transform: "translateY(-50%)",
	marginLeft: "4px",
	whiteSpace: "nowrap",
};

// Runs the tracklist edits one at a time, since each reads the text the
// previous one left.
const enqueueEdit = createSerialQueue();
let pendingEditCount = 0;

// Runs edit once the earlier tracklist edits have finished.
const enqueueTracklistEdit = (edit: () => Promise<void>): Promise<void> => {
	pendingEditCount += 1;
	return enqueueEdit(edit).finally(() => {
		pendingEditCount -= 1;
	});
};

// Checks whether a tracklist edit is queued or running, in which case the
// page may not show the latest text yet.
export const isTracklistEditPending = (): boolean => pendingEditCount > 0;

// Returns once the tracklist edits queued so far have finished.
export const waitForTracklistEdits = (): Promise<void> =>
	enqueueTracklistEdit(() => Promise.resolve());

const getRows = (): HTMLTableRowElement[] => [
	...document.querySelectorAll<HTMLTableRowElement>(
		`${SIMPLE_SELECTOR} ${ROW_SELECTOR}`,
	),
];

// Returns the value of the row's input matching selector.
const readRowInput = (row: Element, selector: string): string =>
	row.querySelector<HTMLInputElement>(selector)?.value ?? "";

// Returns each row that has a track key, from its position field, with
// that key.
const getKeyedRows = (): [TrackKey, HTMLTableRowElement][] => {
	const rows = getRows();
	const keys = getTrackKeys(
		rows.map((row) => readRowInput(row, NUMBER_INPUT_SELECTOR).trim()),
	);
	return rows.flatMap((row, index): [TrackKey, HTMLTableRowElement][] => {
		const key = keys[index];
		return key === undefined ? [] : [[key, row]];
	});
};

// Checks whether the advanced (text) editor is the one showing.
const isAdvancedShowing = (): boolean =>
	forceQuerySelector<HTMLElement>(document)(ADVANCED_SELECTOR).style.display !==
	"none";

// Returns the rows' fields as advanced tracklist text, as RYM builds it.
const readSimpleText = (): string =>
	getRows()
		.map((row) =>
			[NUMBER_INPUT_SELECTOR, TITLE_INPUT_SELECTOR, LENGTH_INPUT_SELECTOR]
				.map((selector) => readRowInput(row, selector))
				.join(TRACKLIST_FIELD_SEPARATOR),
		)
		.join(TRACKLIST_LINE_SEPARATOR);

// Returns the tracklist as advanced text, from whichever editor is showing.
export const readTracklistText = (): string =>
	isAdvancedShowing()
		? forceQuerySelector<HTMLTextAreaElement>(document)(
				ADVANCED_INPUT_SELECTOR,
			).value.trimEnd()
		: readSimpleText();

// Writes each title into its row's title input.
const writeRowTitles = (titles: Map<TrackKey, string>): void => {
	for (const [key, row] of getKeyedRows()) {
		const title = titles.get(key);
		const input = row.querySelector<HTMLInputElement>(TITLE_INPUT_SELECTOR);
		if (title !== undefined && input !== null) {
			input.value = title;
		}
	}
};

// Replaces the advanced editor's text with edit's result, leaving the
// simple editor showing.
const editThroughAdvanced = async (
	edit: (text: string) => string,
): Promise<void> => {
	await showAdvancedTracklist();
	const input = forceQuerySelector<HTMLTextAreaElement>(document)(
		ADVANCED_INPUT_SELECTOR,
	);
	input.value = edit(input.value);
	await showSimpleTracklist();
};

// Replaces the advanced tracklist's text with edit's result, after any
// earlier edits have finished.
export const editAdvancedTracklist = (
	edit: (text: string) => string,
): Promise<void> => enqueueTracklistEdit(() => editThroughAdvanced(edit));

// Makes the tracklist hold text, after any earlier edits have finished.
// When only titles change in the simple editor, they are written into their
// inputs, so RYM doesn't rebuild the rows.
export const writeTracklistText = (text: string): Promise<void> =>
	enqueueTracklistEdit(async () => {
		const currentText = readTracklistText();
		if (currentText === text) {
			return;
		}
		const changedTitles = isAdvancedShowing()
			? undefined
			: getChangedTitles(currentText, text);
		if (changedTitles === undefined) {
			await editThroughAdvanced(() => text);
			return;
		}
		writeRowTitles(changedTitles);
	});

// Calls onChange after a row is added or removed, until the returned
// function is called.
export const watchTracklistRows = (onChange: () => void): (() => void) => {
	const rowParent = forceQuerySelector(document)(
		ROW_TEMPLATE_SELECTOR,
	).parentElement;
	if (rowParent === null) {
		return () => undefined;
	}
	// Only rows, not their contents, so adding reset slots doesn't call onChange.
	const observer = new MutationObserver(onChange);
	observer.observe(rowParent, { childList: true });
	return () => observer.disconnect();
};

// Calls onEdit after the user changes a field or a row is added or removed,
// until the returned function is called.
export const watchTracklistEdits = (onEdit: () => void): (() => void) => {
	const editors = forceQuerySelector(document)(SIMPLE_SELECTOR).parentElement;
	if (editors === null) {
		return () => undefined;
	}
	editors.addEventListener("change", onEdit);
	const stopWatchingRows = watchTracklistRows(onEdit);
	return () => {
		editors.removeEventListener("change", onEdit);
		stopWatchingRows();
	};
};

// Returns the row's reset slot, adding it beside the time cell if missing,
// or undefined if the row has no time cell.
const ensureResetSlot = (row: HTMLTableRowElement): HTMLElement | undefined => {
	const existing = row.querySelector<HTMLElement>(`.${RESET_SLOT_CLASS}`);
	if (existing !== null) {
		return existing;
	}
	const lengthCell = row
		.querySelector(LENGTH_INPUT_SELECTOR)
		?.closest<HTMLTableCellElement>("td");
	if (lengthCell === null || lengthCell === undefined) {
		return undefined;
	}
	// Positions the slot relative to the cell.
	lengthCell.style.position = "relative";
	const slot = document.createElement("span");
	slot.className = RESET_SLOT_CLASS;
	Object.assign(slot.style, RESET_SLOT_STYLE);
	lengthCell.append(slot);
	return slot;
};

// Returns each track's reset slot, adding the slots RYM's row rebuilds
// removed.
export const ensureResetSlots = (): Map<TrackKey, HTMLElement> => {
	const slots = new Map<TrackKey, HTMLElement>();
	for (const [key, row] of getKeyedRows()) {
		const slot = ensureResetSlot(row);
		if (slot !== undefined) {
			slots.set(key, slot);
		}
	}
	return slots;
};
