import { MONTH_NAMES, MONTHS } from "~/shared/utils/datetime";

export { MONTH_NAMES };

function getShortMonthName(month: number): string {
	return MONTHS[month - 1].slice(0, 3);
}

export function isLeapYear(y: number): boolean {
	return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function getDayOfYear(year: number, month: number, day: number): number {
	const dims = [
		0,
		31,
		isLeapYear(year) ? 29 : 28,
		31,
		30,
		31,
		30,
		31,
		31,
		30,
		31,
		30,
		31,
	];
	let doy = day;
	for (let m = 1; m < month; m++) doy += dims[m];
	return doy;
}

export function parseDateFromText(text: string): Date | null {
	const parts = parseDatePartsFromText(text);

	if (!parts) {
		return null;
	}

	if (parts.day && parts.month) {
		return new Date(parts.year, parts.month - 1, parts.day);
	}

	if (parts.month) {
		return new Date(parts.year, parts.month - 1, 15);
	}

	return new Date(parts.year, 0, 1);
}

export function parseDecimalYearFromDateString(text: string): number | null {
	const date = parseDateFromText(text);

	if (!date) {
		return null;
	}

	return decimalYearOf(date);
}

export function parseFullDateFromText(text: string): Date | null {
	const parts = parseDatePartsFromText(text);

	if (!parts?.day || !parts.month) {
		return null;
	}

	return new Date(parts.year, parts.month - 1, parts.day);
}

export function parseDateLabelFromText(text: string): string | null {
	const parts = parseDatePartsFromText(text);

	if (!parts) {
		return null;
	}

	if (parts.day && parts.month) {
		return `${String(parts.day).padStart(2, "0")} ${getShortMonthName(parts.month)} ${parts.year}`;
	}

	if (parts.month) {
		return `${getShortMonthName(parts.month)} ${parts.year}`;
	}

	return String(parts.year);
}

type ParsedDateParts = {
	day?: number;
	month?: number;
	year: number;
};

function parseDatePartsFromText(text: string): ParsedDateParts | null {
	const s = String(text || "").trim();

	const fullMatch = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(s);
	if (fullMatch) {
		const day = Number.parseInt(fullMatch[1], 10);
		const month = MONTH_NAMES[fullMatch[2].toLowerCase()];
		const year = Number.parseInt(fullMatch[3], 10);

		if (month && Number.isFinite(year) && day >= 1 && day <= 31) {
			return { day, month, year };
		}
	}

	const monthYearMatch = /([A-Za-z]+)\s+(\d{4})/.exec(s);
	if (monthYearMatch) {
		const month = MONTH_NAMES[monthYearMatch[1].toLowerCase()];
		const year = Number.parseInt(monthYearMatch[2], 10);

		if (month && Number.isFinite(year)) {
			return { month, year };
		}
	}

	const yearMatch = /\b(19|20)\d{2}\b/.exec(s);
	if (yearMatch) {
		return { year: Number.parseInt(yearMatch[0], 10) };
	}

	return null;
}

export function decimalYearOf(d: Date): number;
export function decimalYearOf(d: Date | null): number | null;
export function decimalYearOf(d: Date | null): number | null {
	if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
	const year = d.getFullYear();
	const startOfYear = new Date(year, 0, 1).getTime();
	const yearMs = new Date(year + 1, 0, 1).getTime() - startOfYear;
	return year + (d.getTime() - startOfYear) / yearMs;
}

export function yearOf(d: Date): number;
export function yearOf(d: Date | null): number | null;
export function yearOf(d: Date | null): number | null {
	return d instanceof Date && !Number.isNaN(d.getTime())
		? d.getFullYear()
		: null;
}

export function currentDecimalYear(): number {
	return decimalYearOf(new Date());
}
