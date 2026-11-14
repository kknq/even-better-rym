import { SEARCHABLES } from "~/shared/services";
import type { ServiceId } from "~/shared/services/types";
import { waitForDocumentReady } from "~/shared/utils/dom";
import { fetchInPage } from "~/shared/utils/fetch";

const VOTE_PAGE_LINK_SELECTOR = 'a[href*="submit_media_link"]';
const LINK_ROW_SELECTOR = "#media_link_list tr";
const COUNTRY_TALLY_PATTERN = /([A-Z]{2}): \+(\d+) \/ -(\d+)/g;

export type LinkVotes = { url: string; scores: Record<string, number> };

// Returns each country's net score from a tally like "CA: +1 / -0, US: +0 / -1".
export const parseCountryScores = (tally: string): Record<string, number> =>
	Object.fromEntries(
		[...tally.matchAll(COUNTRY_TALLY_PATTERN)].map(([, country, up, down]) => [
			country,
			Number(up) - Number(down),
		]),
	);

// Parses every link and its country scores from RYM's media link page.
export const parseLinkVotes = (html: string): LinkVotes[] => {
	const root = new DOMParser().parseFromString(html, "text/html");
	return [...root.querySelectorAll(LINK_ROW_SELECTOR)].flatMap((row) => {
		const link = row.querySelector<HTMLAnchorElement>("td a[href]");
		if (!link) return [];
		const tally = link.nextElementSibling?.textContent ?? "";
		return [{ url: link.href, scores: parseCountryScores(tally) }];
	});
};

// Checks whether none of the links scores above zero in the given region.
export const hasNoUpvotedLink = (
	links: LinkVotes[],
	region: string,
): boolean => {
	const country = region.toUpperCase();
	return links.every((link) => (link.scores[country] ?? 0) <= 0);
};

// Returns the services whose links all score zero or below in the user's region.
export const getServicesWithoutUpvotedLink = (
	links: LinkVotes[],
	serviceRegions: Record<string, string>,
): ServiceId[] =>
	SEARCHABLES.filter((service) => {
		const region = serviceRegions[service.id];
		if (region === undefined) return false;
		const serviceLinks = links.filter((link) => service.regex.test(link.url));
		return serviceLinks.length > 0 && hasNoUpvotedLink(serviceLinks, region);
	}).map((service) => service.id);

// Checks whether any service has both a RYM link and a region to judge its
// votes in.
export const hasRegionalLink = (
	links: Partial<Record<ServiceId, string>>,
	serviceRegions: Record<string, string>,
): boolean =>
	SEARCHABLES.some(
		({ id }) => links[id] !== undefined && serviceRegions[id] !== undefined,
	);

// Fetches the votes on this release page's streaming links, or none if the
// vote page can't be loaded.
export const loadLinkVotes = async (): Promise<LinkVotes[]> => {
	await waitForDocumentReady();
	const votePageLink = document.querySelector<HTMLAnchorElement>(
		VOTE_PAGE_LINK_SELECTOR,
	);
	if (!votePageLink) return [];
	try {
		const html = await fetchInPage({
			url: votePageLink.href,
			credentials: "include",
		});
		return parseLinkVotes(html);
	} catch {
		return [];
	}
};
