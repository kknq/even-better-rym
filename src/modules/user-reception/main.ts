import { runPage } from "~/shared/page-settings";
import { waitForElement } from "~/shared/utils/dom";

import "./user-reception.css";

type RatingEntry = {
	rating: number;
	count: number;
};

type ReceptionCategory = {
	name: string;
	emoji: string;
	ratings: readonly number[];
};

const categories: readonly ReceptionCategory[] = [
	{ name: "Loved it", emoji: "🥰", ratings: [5] },
	{ name: "Really liked it", emoji: "🤩", ratings: [4, 4.5] },
	{ name: "Liked it", emoji: "😏", ratings: [3, 3.5] },
	{ name: "Tolerated it", emoji: "😐", ratings: [2.5] },
	{ name: "Didn't like it", emoji: "😒", ratings: [1.5, 2] },
	{ name: "Despised it", emoji: "😖", ratings: [0.5, 1] },
];

const parseRatingEntries = (
	rows: Iterable<HTMLTableRowElement>,
): RatingEntry[] =>
	Array.from(rows)
		.map((row) => {
			const cells = row.querySelectorAll("td");
			const rating = Number.parseFloat(cells[0]?.textContent?.trim() ?? "");
			const count = Number.parseInt(cells[1]?.textContent?.trim() ?? "", 10);
			return { rating, count };
		})
		.filter(
			(entry): entry is RatingEntry =>
				Number.isFinite(entry.rating) &&
				Number.isFinite(entry.count) &&
				entry.count >= 0,
		);

const parseTableData = (statsContainer: HTMLElement): RatingEntry[] =>
	parseRatingEntries(
		statsContainer.querySelectorAll<HTMLTableRowElement>(
			"#chart_div table tbody tr",
		),
	);

const parseInlineChartData = (): RatingEntry[] => {
	const script = Array.from(document.scripts).find((candidate) =>
		candidate.textContent?.includes("drawChart1"),
	);
	const rows = script?.textContent?.match(
		/data\.addRows\(\[([\s\S]*?)\]\)/,
	)?.[1];
	if (!rows) return [];

	return rows
		.split("],")
		.map((row) => row.replace(/[[\]]/g, "").split(","))
		.map(([rating, count]) => ({
			rating: Number.parseFloat(rating),
			count: Number.parseInt(count, 10),
		}))
		.filter(
			(entry): entry is RatingEntry =>
				Number.isFinite(entry.rating) &&
				Number.isFinite(entry.count) &&
				entry.count >= 0,
		);
};

const getRatingEntries = (statsContainer: HTMLElement): RatingEntry[] => {
	const tableData = parseTableData(statsContainer);
	return tableData.length > 0 ? tableData : parseInlineChartData();
};

const getReceptionClass = (percentage: number): string => {
	if (percentage >= 95) return "ebr-user-reception-meter--acclaim";
	if (percentage >= 80) return "ebr-user-reception-meter--very-positive";
	if (percentage >= 60) return "ebr-user-reception-meter--positive";
	if (percentage >= 40) return "ebr-user-reception-meter--mixed";
	if (percentage >= 20) return "ebr-user-reception-meter--negative";
	return "ebr-user-reception-meter--panned";
};

const getReceptionLabel = (percentage: number): string => {
	if (percentage >= 95) return "Acclaim";
	if (percentage >= 80) return "Very positive";
	if (percentage >= 60) return "Positive";
	if (percentage >= 40) return "Mixed";
	if (percentage >= 20) return "Negative";
	return "Panned";
};

const createReceptionRow = (
	category: ReceptionCategory,
	percentage: number,
	className: string,
): HTMLDivElement => {
	const row = document.createElement("div");
	row.className = className;

	const emoji = document.createElement("span");
	emoji.className = "ebr-user-reception-emoji";
	emoji.textContent = category.emoji;
	emoji.setAttribute("aria-hidden", "true");

	const text = document.createElement("span");
	text.textContent = `${percentage.toFixed(1)}% ${category.name}`;
	row.append(emoji, text);
	return row;
};

const appendReception = (
	statsContainer: HTMLElement,
	entries: readonly RatingEntry[],
): void => {
	if (statsContainer.querySelector(".ebr-user-reception")) return;

	const counts = categories.map((category) =>
		entries
			.filter((entry) => category.ratings.includes(entry.rating))
			.reduce((total, entry) => total + entry.count, 0),
	);
	const total = counts.reduce((sum, count) => sum + count, 0);
	if (total <= 0) return;

	const percentages = counts.map((count) => (count / total) * 100);
	const positivePercentage =
		((counts[0] + counts[1] + counts[2]) / total) * 100;
	const roundedPositivePercentage = Math.round(positivePercentage);
	const rankedCategories = categories
		.map((category, index) => ({ category, percentage: percentages[index] }))
		.sort((a, b) => b.percentage - a.percentage);

	const section = document.createElement("section");
	section.className = "ebr-user-reception";
	section.setAttribute("aria-labelledby", "ebr-user-reception-heading");

	const heading = document.createElement("div");
	heading.className = "header";
	heading.id = "ebr-user-reception-heading";
	heading.textContent = "User reception";

	const meter = document.createElement("div");
	meter.className = `ebr-user-reception-meter ${getReceptionClass(
		roundedPositivePercentage,
	)}`;
	meter.setAttribute(
		"aria-label",
		`${roundedPositivePercentage}% positive reception, ${getReceptionLabel(
			roundedPositivePercentage,
		)}`,
	);

	const percentage = document.createElement("span");
	percentage.className = "ebr-user-reception-meter__percentage";
	percentage.textContent = `${roundedPositivePercentage}%`;

	const label = document.createElement("span");
	label.className = "ebr-user-reception-meter__label";
	label.textContent = getReceptionLabel(roundedPositivePercentage);
	meter.append(percentage, label);

	const list = document.createElement("div");
	list.className = "ebr-user-reception-list";
	rankedCategories.forEach(
		({ category, percentage: categoryPercentage }, index) => {
			list.append(
				createReceptionRow(
					category,
					categoryPercentage,
					index === 0
						? "ebr-user-reception-list__item ebr-user-reception-list__item--top"
						: "ebr-user-reception-list__item",
				),
			);
		},
	);

	section.append(heading, meter, list);
	statsContainer.append(section);
};

async function main(): Promise<void> {
	const statsContainer = await waitForElement<HTMLElement>(
		".catalog_stats.hide-for-small",
	);
	const entries = getRatingEntries(statsContainer);
	appendReception(statsContainer, entries);
}

void runPage("userReception", main);
