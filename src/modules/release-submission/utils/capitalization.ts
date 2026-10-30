import { findLastIndex } from "~/shared/utils/array";
import { pipe } from "~/shared/utils/pipe";

import type { Phrase, Token } from "./tokenize";
import { tokenize } from "./tokenize";

export const CAPITALIZATION_TYPES = [
	"title-case",
	"sentence-case",
	"as-is",
] as const;
export type CapitalizationType = (typeof CAPITALIZATION_TYPES)[number];

const ENG_DO_NOT_CAPITALIZE = new Set([
	"a",
	"an",
	"the",
	"and",
	"but",
	"or",
	"nor",
	"for",
	"yet",
	"as",
	"at",
	"by",
	"for",
	"in",
	"of",
	"on",
	"to",
	"versus",
	"vs",
	"vs.",
	"v",
	"v.",
	"n",
	"'n",
	"n'",
	"'n'",
	"o'",
	"o",
]);

// Don't capitalize even if it's the first or last word
const ENG_DO_NOT_CAPITALIZE_FORCE = new Set(["etc", "etc."]);

const UPPERCASE_EXCEPTIONS = ["ep", "lp", "nts"];
const UPPERCASE_EXCEPTION_PATTERN = new RegExp(
	`(?<![\\p{L}\\p{M}\\p{N}_])(?:${UPPERCASE_EXCEPTIONS.join("|")})(?![\\p{L}\\p{M}\\p{N}_])`,
	"giu",
);

const isWord = ({ type }: Token) => type === "word" || type === "romanNumeral";

const isAfterHyphen = (phrase: Phrase, index: number) =>
	phrase.slice(0, index).findLast((token) => token.type !== "whitespace")
		?.text === "-";

const isAfterUnspacedHyphen = (phrase: Phrase, index: number) =>
	phrase[index - 1]?.text === "-";

const toTitleCase = (token: Token) => {
	const { text, type } = token;
	if (!text[0]) return text;
	if (type === "romanNumeral") return text.toUpperCase();
	return text[0].toUpperCase() + text.slice(1).toLowerCase();
};

export const capitalize = (
	text: string,
	capitalization: CapitalizationType,
): string =>
	capitalization === "as-is"
		? text
		: tokenize(text.toLowerCase())
				.map(capitalizePhrase(capitalization))
				.join("")
				.replace(UPPERCASE_EXCEPTION_PATTERN, (word) => word.toUpperCase());

const capitalizePhrase =
	(capitalization: Exclude<CapitalizationType, "as-is">) =>
	(phrase: Phrase): string => {
		const firstWordIndex = phrase.findIndex(isWord);
		const lastWordIndex = findLastIndex(phrase, isWord);

		return capitalization === "sentence-case"
			? pipe(
					phrase
						.map((token, index) => {
							if (index === firstWordIndex) return toTitleCase(token);
							if (token.type === "romanNumeral")
								return token.text.toUpperCase();
							if (token.type === "word" && isAfterUnspacedHyphen(phrase, index))
								return token.text.toLowerCase();
							if (token.type === "word" && isAfterHyphen(phrase, index))
								return toTitleCase(token);
							return token.text.toLowerCase();
						})
						.join(""),
					formatMixText,
				)
			: pipe(
					phrase
						.map((token, index) => {
							if (
								token.type === "word" &&
								/[а-яё]/i.test(token.text) &&
								isAfterUnspacedHyphen(phrase, index)
							) {
								return token.text.toLowerCase();
							}
							if (index === firstWordIndex || index === lastWordIndex) {
								const isForced = ENG_DO_NOT_CAPITALIZE_FORCE.has(
									token.text.toLowerCase(),
								);
								return isForced ? token.text.toLowerCase() : toTitleCase(token);
							} else if (
								token.type === "word" &&
								isAfterHyphen(phrase, index)
							) {
								return toTitleCase(token);
							} else if (ENG_DO_NOT_CAPITALIZE.has(token.text.toLowerCase())) {
								return token.text.toLowerCase();
							} else {
								return toTitleCase(token);
							}
						})
						.join(""),
					formatMixText,
				);
	};

const formatMixText = (text: string) => {
	const regex = /\s+-\s+(.*)\b((?:[Rr]emix|[Mm]ix)(?:e?s)?)/;
	const match = regex.exec(text);
	if (!match) return text;

	const artistText = match[1]?.trim() ?? "";
	const mixType = match[2]?.trim() ?? "";

	const parenthesizedText = [artistText, mixType]
		.filter((s) => s.length > 0)
		.join(" ");

	return text.replace(regex, ` (${parenthesizedText})`);
};
