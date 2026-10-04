export type RatingEntry = {
	rating: number;
	count: number;
};

const parseRatingEntries = (
	rows: readonly (readonly string[])[],
): RatingEntry[] =>
	rows
		.map(([rating, count]) => ({
			rating: Number.parseFloat(rating ?? ""),
			count: Number.parseInt(count ?? "", 10),
		}))
		.filter(
			(entry) =>
				Number.isFinite(entry.rating) &&
				Number.isFinite(entry.count) &&
				entry.count >= 0,
		);

export const parseInlineChartData = (source: string): RatingEntry[] => {
	if (!source.includes("drawChart1")) return [];
	const rows = /data\.addRows\(\[([\s\S]*?)\]\)/.exec(source)?.[1];
	if (!rows) return [];

	return parseRatingEntries(
		rows.split("],").map((row) => row.replace(/[[\]]/g, "").split(",")),
	);
};

export const getRatingEntries = (
	statsContainer: HTMLElement,
): RatingEntry[] => {
	const rows = statsContainer.querySelectorAll<HTMLTableRowElement>(
		"#chart_div table tbody tr",
	);
	const tableData = parseRatingEntries(
		Array.from(rows, (row) =>
			Array.from(row.querySelectorAll("td"), (cell) => cell.textContent ?? ""),
		),
	);
	if (tableData.length > 0) return tableData;

	for (const script of document.scripts) {
		const entries = parseInlineChartData(script.textContent ?? "");
		if (entries.length > 0) return entries;
	}
	return [];
};
