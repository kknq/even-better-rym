import { equals } from "~/shared/utils/array";
import { forceQuerySelector, runScript } from "~/shared/utils/dom";
import { createSerialQueue } from "~/shared/utils/serial-queue";

import type {
	FiledUnderChanges,
	FiledUnderEntry,
	FiledUnderListChange,
} from "./release-artist-links";
import {
	getRepeatedIndexes,
	orderFiledUnderIds,
	parseArtistTokenId,
	planFiledUnderChanges,
} from "./release-artist-links";

const LIST_SELECTOR = "#filed_under_performerx";
const ENTRY_SELECTOR = "li.sortable_filed_under_performer";
const ENTRY_TOKEN_SELECTOR = 'input[id^="filed_under_performer_artist_"]';
const ENTRY_NAME_SELECTOR = ".filed_under_artist_preview";
const ENTRY_NUMBER_PATTERN = /^filed_under_performer_(\d+)$/;
const SEARCH_INPUT_SELECTOR = "#filed_under_searchterm";
const SEARCH_BUTTON_SELECTOR =
	"#section_filed_under .gosearch input[type=button]";
const NOT_SAME_AS_PARENT_SELECTOR = "#filed_under_same_as_parent_no";
const FILED_UNDER_LABEL = "performer";

// Runs the list edits one at a time, since each reads the list the previous
// one left.
const enqueueListEdit = createSerialQueue();

// Returns the entry an element of the filed-under list holds, if it is one.
const parseEntryElement = (element: Element): FiledUnderEntry | undefined => {
	const token =
		element.querySelector<HTMLInputElement>(ENTRY_TOKEN_SELECTOR)?.value ?? "";
	const id = parseArtistTokenId(token);
	if (id === undefined) {
		return undefined;
	}
	const name =
		element.querySelector(ENTRY_NAME_SELECTOR)?.textContent?.trim() ?? "";
	return { id, name };
};

const getEntryElements = (): Element[] => [
	...document.querySelectorAll(ENTRY_SELECTOR),
];

// Returns the artists currently in the filed-under list, in order.
export const readFiledUnderEntries = (): FiledUnderEntry[] =>
	getEntryElements()
		.map(parseEntryElement)
		.filter((entry) => entry !== undefined);

// Returns the list element holding the artist with the given id.
const findEntryElement = (id: string): Element | undefined =>
	getEntryElements().find(
		(candidate) => parseEntryElement(candidate)?.id === id,
	);

// Returns RYM's row number for a list element.
const getEntryNumber = (element: Element | undefined): string | undefined =>
	ENTRY_NUMBER_PATTERN.exec(element?.id ?? "")?.[1];

// Removes RYM's row with the given number from the filed-under list.
const deleteEntryRow = async (
	entryNumber: string | undefined,
): Promise<void> => {
	if (entryNumber === undefined) {
		return;
	}
	await runScript(
		`deleteFiledUnder(${entryNumber}, ${JSON.stringify(FILED_UNDER_LABEL)});`,
	);
};

// Removes the entry with the given artist id from the filed-under list.
const removeFiledUnderEntry = (id: string): Promise<void> =>
	deleteEntryRow(getEntryNumber(findEntryElement(id)));

// Removes every later copy of an artist listed more than once, since RYM
// adds an artist again when it is picked while already listed.
export const removeRepeatedFiledUnderEntries = (): Promise<void> =>
	enqueueListEdit(async () => {
		const elements = getEntryElements();
		const ids = elements.map((element) => parseEntryElement(element)?.id);
		for (const index of getRepeatedIndexes(ids)) {
			await deleteEntryRow(getEntryNumber(elements[index]));
		}
	});

// Adds the artist to the end of the filed-under list.
const addFiledUnderEntry = (entry: FiledUnderEntry): Promise<void> =>
	runScript(
		`addFiledUnder(${JSON.stringify(FILED_UNDER_LABEL)}, ${JSON.stringify(entry.id)}, ${JSON.stringify(entry.name)});`,
	);

// Moves the entries into the given artist id order and has RYM update the
// credited name to match.
const reorderFiledUnderEntries = async (ids: string[]): Promise<void> => {
	const list = document.querySelector(LIST_SELECTOR);
	if (list === null) {
		return;
	}
	for (const id of ids) {
		const element = findEntryElement(id);
		if (element !== undefined) {
			list.append(element);
		}
	}
	await runScript(
		`updateFiledUnderOrder(${JSON.stringify(FILED_UNDER_LABEL)});`,
	);
};

// Applies the changes to the filed-under list, one at a time.
const applyFiledUnderChanges = async (
	changes: FiledUnderChanges,
): Promise<void> => {
	for (const id of changes.remove) {
		await removeFiledUnderEntry(id);
	}
	for (const entry of changes.add) {
		await addFiledUnderEntry(entry);
	}
};

// Reorders the filed-under list so the chosen artists come first, in their
// chosen order, which is the order RYM credits them in.
const keepChosenOrder = async (
	chosenEntries: FiledUnderEntry[],
): Promise<void> => {
	const currentIds = readFiledUnderEntries().map((entry) => entry.id);
	const orderedIds = orderFiledUnderIds(
		currentIds,
		chosenEntries.map((entry) => entry.id),
	);
	if (!equals(orderedIds, currentIds)) {
		await reorderFiledUnderEntries(orderedIds);
	}
};

// Makes the filed-under list hold the chosen entries first, in order,
// removing only entries whose ids are in managedIds, after any earlier edits
// have finished.
export const syncFiledUnderEntries = (
	chosenEntries: FiledUnderEntry[],
	managedIds: Set<string>,
): Promise<void> =>
	enqueueListEdit(async () => {
		await applyFiledUnderChanges(
			planFiledUnderChanges(readFiledUnderEntries(), {
				entries: chosenEntries,
				managedIds,
			}),
		);
		await keepChosenOrder(chosenEntries);
	});

// Removes every artist from the filed-under list, after any earlier edits
// have finished.
export const clearFiledUnderEntries = (): Promise<void> =>
	enqueueListEdit(async () => {
		for (const entry of readFiledUnderEntries()) {
			await removeFiledUnderEntry(entry.id);
		}
	});

// Runs RYM's filed-under artist search for name.
export const searchFiledUnder = (name: string): void => {
	forceQuerySelector<HTMLInputElement>(document)(SEARCH_INPUT_SELECTOR).value =
		name;
	forceQuerySelector<HTMLInputElement>(document)(
		SEARCH_BUTTON_SELECTOR,
	).click();
};

// Switches an issue's form from "credited in the same manner as the parent
// issue" to editing its own filed-under list.
export const switchAwayFromSameAsParent = (): void =>
	document
		.querySelector<HTMLInputElement>(NOT_SAME_AS_PARENT_SELECTOR)
		?.click();

// Returns the list's entries not among knownElements, and every artist id it
// lists.
const getListChange = (
	elements: Element[],
	knownElements: Set<Element>,
): FiledUnderListChange => {
	const added: FiledUnderEntry[] = [];
	const presentIds = new Set<string>();
	for (const element of elements) {
		const entry = parseEntryElement(element);
		if (entry === undefined) {
			continue;
		}
		presentIds.add(entry.id);
		if (!knownElements.has(element)) {
			added.push(entry);
		}
	}
	return { added, presentIds };
};

// Calls onChange after each change to the filed-under list, until the
// returned function is called. Entries the change only moved don't count as
// added. A change made by a list edit is reported once the edit finishes, so
// the list never looks half-edited.
export const watchFiledUnderChanges = (
	onChange: (change: FiledUnderListChange) => void,
): (() => void) => {
	const list = document.querySelector(LIST_SELECTOR);
	if (list === null) {
		return () => undefined;
	}
	let knownElements = new Set(getEntryElements());
	let isReportQueued = false;
	let isWatching = true;
	const reportChange = (): Promise<void> => {
		isReportQueued = false;
		if (!isWatching) {
			return Promise.resolve();
		}
		const elements = getEntryElements();
		const change = getListChange(elements, knownElements);
		knownElements = new Set(elements);
		onChange(change);
		return Promise.resolve();
	};
	const observer = new MutationObserver(() => {
		if (!isReportQueued) {
			isReportQueued = true;
			void enqueueListEdit(reportChange);
		}
	});
	observer.observe(list, { childList: true, subtree: true });
	return () => {
		isWatching = false;
		observer.disconnect();
	};
};
