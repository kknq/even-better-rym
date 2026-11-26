import type { Searchable, Service } from "~/shared/services/types";
import { parseError } from "~/shared/utils/error";
import type { OneShot } from "~/shared/utils/one-shot";
import { complete, failed, isFailed } from "~/shared/utils/one-shot";

import type { PageData } from "./use-page-data";

export type StreamLinkState = OneShot<Error, StreamLinkCompleteState>;
type StreamLinkCompleteState =
	| { _tag: "exists" | "found"; url: string }
	| { _tag: "not-found" };

const notFound: StreamLinkState = complete({ _tag: "not-found" });

// Returns RYM's link for a service, or a search result in its place when RYM
// has no link or its links are voted down in the user's region.
export async function getStreamLinkState(
	service: Service & Searchable,
	releaseData: PageData,
): Promise<StreamLinkState> {
	const rymLink = releaseData.links[service.id];
	if (rymLink === undefined) {
		return searchStreamLink(service, releaseData.metadata);
	}

	const rymState = complete({ _tag: "exists" as const, url: rymLink });
	const isDownvoted = releaseData.servicesWithOnlyDownvotedLinks.includes(
		service.id,
	);
	if (!isDownvoted) {
		return rymState;
	}

	const searchState = await searchStreamLink(service, releaseData.metadata);
	return isFailed(searchState) ? rymState : searchState;
}

// Searches the service for the release.
async function searchStreamLink(
	service: Service & Searchable,
	metadata: PageData["metadata"],
): Promise<StreamLinkState> {
	try {
		const foundLink = await service.search(metadata);
		if (foundLink === undefined) {
			return notFound;
		}
		return complete({ _tag: "found", url: foundLink });
	} catch (error: unknown) {
		return failed(parseError(error));
	}
}
