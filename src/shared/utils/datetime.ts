import type { ReleaseDate } from "../services/types";
import { isDefined } from "./types";

export const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
] as const;

const DURATION_PATTERN = /^(?:(\d+):)?(\d+):(\d{2})$/;

export const MONTH_NAMES: Readonly<Record<string, number>> = Object.fromEntries(
	MONTHS.map((month, index) => [month.toLowerCase(), index + 1]),
);

export const stringToDate = (dateString: string): ReleaseDate => {
	const date = new Date(dateString);
	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
	};
};

export const secondsToString = (seconds: number): string => {
	seconds = Math.round(seconds);
	const min = Math.floor(seconds / 60);
	const sec = Math.floor(seconds % 60);
	return `${min}:${sec.toString().padStart(2, "0")}`;
};

export const formatDuration = (duration: string): string => {
	const match = DURATION_PATTERN.exec(duration);
	if (!match) {
		return duration;
	}

	const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
	const minutes = Number.parseInt(match[2], 10);
	const seconds = Number.parseInt(match[3], 10);

	return secondsToString(hours * 3600 + minutes * 60 + seconds);
};

export const datesEqual = (a: ReleaseDate, b: ReleaseDate) =>
	a.day === b.day && a.month === b.month && a.year === b.year;

export const dateToString = (date: ReleaseDate) =>
	[
		date.year,
		date.month?.toString().padStart(2, "0"),
		date.day?.toString().padStart(2, "0"),
	]
		.filter(isDefined)
		.join("-");

export const ONE_SECOND_MS = 1000;
export const ONE_MINUTE_MS = 60 * ONE_SECOND_MS;
