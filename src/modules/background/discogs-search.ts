import browser from "webextension-polyfill";
import { createDiscogsSearch } from "~/shared/services/discogs/search";
import type {
	DiscogsSearchRequest,
	DiscogsSearchResponse,
} from "~/shared/utils/messaging";
import { backgroundFetch } from "./fetch";

export const discogsSearch = async ({
	id,
	data: { release, issue },
}: DiscogsSearchRequest): Promise<DiscogsSearchResponse> => {
	try {
		const search = createDiscogsSearch((data) =>
			backgroundFetch({ id, type: "fetch", data }),
		);
		const url = await search.findDestination(release, issue);
		if (url) await browser.tabs.create({ url });
		return { id, type: "discogsSearch", data: { url } };
	} catch (error) {
		return {
			id,
			type: "discogsSearch",
			data: {
				error:
					error instanceof Error ? error.message : "Discogs search failed.",
			},
		};
	}
};
