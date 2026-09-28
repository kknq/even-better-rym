import type { ReleaseIssue } from "~/shared/release-data";

export type SearchResult = {
	catno?: string;
	country?: string;
	format?: string[];
	label?: string[];
	resource_url?: string;
	title?: string;
	year?: number;
};

const normalize = (value: string): string =>
	value.toLowerCase().replace(/[^a-z0-9]/g, "");

export const findBestReleaseMatch = (
	result: SearchResult,
	issue: ReleaseIssue,
): number => {
	if (
		!result.catno ||
		normalize(result.catno) !== normalize(issue.catalogNumber)
	)
		return -1;

	const normalizedLabel = normalize(issue.label);
	if (
		normalizedLabel &&
		!result.label?.some((label) => normalize(label) === normalizedLabel)
	)
		return -1;

	const normalizedTitle = normalize(issue.title);
	const normalizedArtist = normalize(issue.artist);
	const normalizedResultTitle = normalize(result.title ?? "");
	if (
		(normalizedTitle && !normalizedResultTitle.includes(normalizedTitle)) ||
		(normalizedArtist && !normalizedResultTitle.includes(normalizedArtist)) ||
		(!normalizedLabel && !normalizedTitle && !normalizedArtist)
	)
		return -1;

	let score = 100;
	if (normalizedLabel) score += 20;
	if (normalizedTitle) score += 10;
	if (normalizedArtist) score += 10;
	if (issue.year && result.year === issue.year) score += 5;
	if (
		issue.country &&
		result.country &&
		normalize(result.country) === normalize(issue.country)
	)
		score += 5;
	if (
		issue.format &&
		result.format?.some((format) =>
			normalize(format).includes(normalize(issue.format)),
		)
	)
		score += 5;
	return score;
};
