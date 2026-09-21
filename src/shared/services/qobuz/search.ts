import { fetch } from "~/shared/utils/fetch";

import type { SearchFunction } from "../types";

export const search: SearchFunction = async ({ artist, title }) => {
	const query = encodeURIComponent(`${artist} ${title}`.replace(/\//g, " "));
	const response = await fetch({
		url: `https://www.qobuz.com/us-en/search/albums/${query}`,
		method: "GET",
	});

	const html = new DOMParser().parseFromString(response, "text/html");
	const firstLink = html.querySelector(
		'#release-card-list a[href*="/us-en/album/"]',
	) as HTMLAnchorElement | null;
	if (!firstLink) return undefined;

	const href = firstLink.getAttribute("href") ?? "";
	const album_id = href.substring(href.lastIndexOf("/"));
	return `https://open.qobuz.com/album${album_id}`;
};
