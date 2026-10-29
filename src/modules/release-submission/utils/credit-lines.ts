import { createSerialQueue } from "~/shared/utils/serial-queue";
import type { ArtistCredit } from "./page-functions";
import { addArtistCredit, deleteCreditLine } from "./page-functions";

export const enqueueCreditEdit = createSerialQueue();

export type CreditChoice =
	| { kind: "linked"; token: string; line: string | undefined }
	| { kind: "text"; line: string | undefined }
	| { kind: "skipped" };

const CREDIT_LINE_SELECTOR = "#creditsx li.sortable_credit";
const CREDIT_LINE_ID_PREFIX = "credits_";

// Adds a credit line and returns its number.
export const addCreditLine = async (credit: ArtistCredit): Promise<string> => {
	const previous = new Set(document.querySelectorAll(CREDIT_LINE_SELECTOR));
	await addArtistCredit(credit);
	const added = [...document.querySelectorAll(CREDIT_LINE_SELECTOR)].filter(
		(line) => !previous.has(line),
	);
	const line = added[0]?.id;
	if (added.length !== 1 || !line?.startsWith(CREDIT_LINE_ID_PREFIX)) {
		throw new Error(`Could not identify the new credit for ${credit.name}`);
	}
	return line.slice(CREDIT_LINE_ID_PREFIX.length);
};

// Removes the numbered credit line, if there is one.
export const removeCreditLine = async (
	line: string | undefined,
): Promise<void> => {
	if (line !== undefined) {
		await deleteCreditLine(line);
	}
};
