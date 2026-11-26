import type { ReleaseIssue } from "~/shared/release-data";
import type { ReleaseTitleData } from "~/shared/release-title";
import type { FetchRequest, FetchResponse } from "~/shared/utils/messaging";
import { sendBackgroundMessage } from "~/shared/utils/messaging";
import {
	findBestReleaseMatch,
	matchesReleaseIdentity,
	type SearchResult,
} from "./matching";

const DISCOGS_API = "https://api.discogs.com";

export type ReleaseResponse = {
	images?: { type?: string; uri?: string }[];
};

type SearchResponse = { results?: SearchResult[] };
type FetchDiscogs = (data: FetchRequest["data"]) => Promise<FetchResponse>;

export const createDiscogsSearch = (
	request: FetchDiscogs = (data) =>
		sendBackgroundMessage<FetchRequest, FetchResponse>({ type: "fetch", data }),
) => {
	const fetchJson = async <T>(url: string): Promise<T> => {
		const response = await request({
			url,
			headers: {
				Accept: "application/json",
			},
		});
		if (response.data.status === 429) {
			throw new Error("Discogs rate limit reached. Please try again later.");
		}
		if (response.data.error) throw new Error(response.data.error);
		if (response.data.status < 200 || response.data.status >= 300) {
			throw new Error(
				`Discogs request failed (${response.data.status} ${response.data.statusText}).`,
			);
		}
		return JSON.parse(response.data.body) as T;
	};

	const search = (parameters: Record<string, string>) =>
		fetchJson<SearchResponse>(
			`${DISCOGS_API}/database/search?${new URLSearchParams({
				...parameters,
				per_page: "10",
			})}`,
		);

	const findReleaseMatch = async (
		issue: ReleaseIssue,
	): Promise<(SearchResult & { resource_url: string }) | undefined> => {
		const response = await search({
			...(issue.catalogNumber ? { catno: issue.catalogNumber } : {}),
			type: "release",
			...(issue.artist ? { artist: issue.artist } : {}),
			...(issue.title ? { release_title: issue.title } : {}),
		});
		const bestMatch = (response.results ?? [])
			.filter(
				(result): result is SearchResult & { resource_url: string } =>
					typeof result.resource_url === "string" &&
					/^https:\/\/api\.discogs\.com\/releases\/[1-9]\d*$/.test(
						result.resource_url,
					),
			)
			.sort(
				(a, b) =>
					findBestReleaseMatch(b, issue) - findBestReleaseMatch(a, issue),
			)[0];
		if (!bestMatch || findBestReleaseMatch(bestMatch, issue) < 0)
			return undefined;
		return bestMatch;
	};

	const findRelease = async (
		issue: ReleaseIssue,
	): Promise<ReleaseResponse | undefined> => {
		const match = await findReleaseMatch(issue);
		return match ? fetchJson<ReleaseResponse>(match.resource_url) : undefined;
	};

	const findDestination = async (
		release: ReleaseTitleData,
		issue?: ReleaseIssue,
	): Promise<string | undefined> => {
		if (issue) {
			const match = await findReleaseMatch(issue);
			if (match)
				return match.resource_url.replace(
					`${DISCOGS_API}/releases/`,
					"https://www.discogs.com/release/",
				);
		}
		const artists = [
			...new Set([
				release.artistName,
				release.nativeArtistName ?? release.artistName,
			]),
		];
		const titles = [
			...new Set([
				release.albumTitle,
				release.nativeAlbumTitle ?? release.albumTitle,
			]),
		];
		for (const artist of artists) {
			for (const title of titles) {
				const response = await search({
					artist,
					release_title: title,
					type: "master",
				});
				const master = response.results?.find(
					(result) =>
						result.id != null &&
						result.id > 0 &&
						matchesReleaseIdentity(result, artist, title),
				);
				if (master) return `https://www.discogs.com/master/${master.id}`;
			}
		}
		return undefined;
	};

	return { findRelease, findDestination };
};
