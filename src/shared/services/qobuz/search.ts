import { fetch } from "~/shared/utils/fetch";

import type { SearchFunction } from "../types";

export const search: SearchFunction = async ({ artist, title }) => {
	const query = `${artist} ${title}`.replace(/\//g, " ");
	const normalized = query
		.normalize("NFKD")
		.replace(/\p{M}/gu, "")
		.replace(/ø/gi, "o")
		.replace(/\p{P}/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
	const queries =
		normalized && normalized !== query ? [query, normalized] : [query];
	for (const candidate of queries) {
		const response = await fetch({
			url: `https://www.qobuz.com/us-en/search/albums/${encodeURIComponent(candidate)}`,
			method: "GET",
		});

		const html = new DOMParser().parseFromString(response, "text/html");
		const firstLink = html.querySelector<HTMLAnchorElement>(
			'#release-card-list a[href*="/us-en/album/"], [id^="release-card-list-"] a[href*="/us-en/album/"]',
		);
		if (!firstLink) continue;

		const href = firstLink.getAttribute("href") ?? "";
		const album_id = href.substring(href.lastIndexOf("/"));
		return `https://open.qobuz.com/album${album_id}`;
	}
	return undefined;
};
