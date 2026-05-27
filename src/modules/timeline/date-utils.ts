export const MONTH_NAMES: Readonly<Record<string, number>> = {
	january: 1,
	february: 2,
	march: 3,
	april: 4,
	may: 5,
	june: 6,
	july: 7,
	august: 8,
	september: 9,
	october: 10,
	november: 11,
	december: 12,
};

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
	const s = String(text || "").trim();

	const fullMatch = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(s);
	if (fullMatch) {
		const day = Number.parseInt(fullMatch[1], 10);
		const month = MONTH_NAMES[fullMatch[2].toLowerCase()];
		const year = Number.parseInt(fullMatch[3], 10);
		if (month && Number.isFinite(year) && day >= 1 && day <= 31) {
			return new Date(year, month - 1, day);
		}
	}

	const monthYearMatch = /([A-Za-z]+)\s+(\d{4})/.exec(s);
	if (monthYearMatch) {
		const month = MONTH_NAMES[monthYearMatch[1].toLowerCase()];
		const year = Number.parseInt(monthYearMatch[2], 10);
		if (month && Number.isFinite(year)) {
			return new Date(year, month - 1, 15);
		}
	}

	const yearMatch = /\b(19|20)\d{2}\b/.exec(s);
	if (yearMatch) {
		return new Date(Number.parseInt(yearMatch[0], 10), 0, 1);
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
