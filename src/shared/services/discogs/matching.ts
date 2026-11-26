import type { ReleaseIssue } from "~/shared/release-data";
import { stripDiscogsArtistDisambiguator } from "./artist-name";

export type SearchResult = {
	catno?: string;
	country?: string;
	format?: string[];
	label?: string[];
	resource_url?: string;
	title?: string;
	year?: number | string;
	id?: number;
};

const normalize = (value: string): string =>
	value
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]/gu, "");

export const matchesReleaseIdentity = (
	result: SearchResult,
	artist: string,
	title: string,
): boolean => {
	const [resultArtist, ...resultTitle] = (result.title ?? "").split(" - ");
	return Boolean(
		normalize(artist) &&
			normalize(title) &&
			normalize(stripDiscogsArtistDisambiguator(resultArtist)) ===
				normalize(artist) &&
			normalize(resultTitle.join(" - ")) === normalize(title),
	);
};

const matchesReleaseIssue = (
	result: SearchResult,
	issue: ReleaseIssue,
): boolean => {
	if (issue.catalogNumber) {
		return Boolean(
			result.catno &&
				normalize(result.catno) === normalize(issue.catalogNumber),
		);
	}
	return Boolean(
		matchesReleaseIdentity(result, issue.artist, issue.title) &&
			issue.format &&
			result.format?.some(
				(format) => normalize(format) === normalize(issue.format),
			) &&
			issue.year &&
			Number(result.year) === issue.year,
	);
};

const getEditionScore = (result: SearchResult, issue: ReleaseIssue): number => {
	let score = 0;
	if (issue.year && Number(result.year) === issue.year) score += 5;
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

export const findBestReleaseMatch = (
	result: SearchResult,
	issue: ReleaseIssue,
): number => {
	if (!matchesReleaseIssue(result, issue)) return -1;

	const normalizedLabel = normalize(issue.label);
	const labelMatches = Boolean(
		normalizedLabel &&
			result.label?.some((label) => normalize(label) === normalizedLabel),
	);
	const normalizedTitle = normalize(issue.title);
	const normalizedArtist = normalize(issue.artist);
	const normalizedResultTitle = normalize(result.title ?? "");
	if (
		(normalizedLabel &&
			!labelMatches &&
			(!normalizedTitle || !normalizedArtist)) ||
		(normalizedTitle && !normalizedResultTitle.includes(normalizedTitle)) ||
		(normalizedArtist && !normalizedResultTitle.includes(normalizedArtist)) ||
		(!normalizedLabel && !normalizedTitle && !normalizedArtist)
	)
		return -1;

	let score = 100 + getEditionScore(result, issue);
	if (labelMatches) score += 20;
	if (normalizedTitle) score += 10;
	if (normalizedArtist) score += 10;
	return score;
};
