import type { RatingEntry } from "./data";

type Category = {
	name: string;
	ratings: readonly number[];
};

type RankedCategory = {
	name: string;
	description: string;
	percentage: number;
};

export type Reception = {
	positivePercentage: number;
	label: string;
	level: string;
	categories: RankedCategory[];
};

const categories: readonly Category[] = [
	{ name: "Loved it", ratings: [5] },
	{ name: "Really liked it", ratings: [4, 4.5] },
	{ name: "Liked it", ratings: [3, 3.5] },
	{ name: "Tolerated it", ratings: [2.5] },
	{ name: "Didn't like it", ratings: [1.5, 2] },
	{ name: "Despised it", ratings: [0.5, 1] },
];

const levels = [
	{ minimum: 95, label: "Acclaim", level: "acclaim" },
	{ minimum: 80, label: "Very positive", level: "very-positive" },
	{ minimum: 60, label: "Positive", level: "positive" },
	{ minimum: 40, label: "Mixed", level: "mixed" },
	{ minimum: 20, label: "Negative", level: "negative" },
	{ minimum: 0, label: "Panned", level: "panned" },
];

export const getReception = (
	entries: readonly RatingEntry[],
): Reception | undefined => {
	const counts = categories.map((category) =>
		entries
			.filter((entry) => category.ratings.includes(entry.rating))
			.reduce((total, entry) => total + entry.count, 0),
	);
	const total = counts.reduce((sum, count) => sum + count, 0);
	if (total <= 0) return undefined;

	const positivePercentage = Math.round(
		((counts[0] + counts[1] + counts[2]) / total) * 100,
	);
	const level = levels.find(({ minimum }) => positivePercentage >= minimum);
	if (!level) throw new Error("Invalid reception percentage");

	return {
		positivePercentage,
		label: level.label,
		level: level.level,
		categories: categories
			.map(({ name, ratings }, index) => ({
				name,
				description: `Includes ${ratings.map((rating) => `${rating}-star`).join(" and ")} ratings`,
				percentage: (counts[index] / total) * 100,
			}))
			.sort((a, b) => b.percentage - a.percentage),
	};
};
