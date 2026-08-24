export type YearRange = {
	start: number;
	end: number;
};

export const yearRange = (year: number): YearRange => ({
	start: year,
	end: year,
});

export const decadeRange = (year: number): YearRange => ({
	start: year,
	end: year + 9,
});

export const combineYearRanges = (
	first: YearRange,
	second: YearRange,
): YearRange => ({
	start: Math.min(first.start, second.start),
	end: Math.max(first.end, second.end),
});
