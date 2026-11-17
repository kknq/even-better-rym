import type { Searchable, Service } from "~/shared/services/types";
import type { StreamLinkSettings } from "~/shared/stream-links/settings";
import { parseError } from "~/shared/utils/error";
import type { OneShot } from "~/shared/utils/one-shot";
import {
	complete,
	failed,
	isComplete,
	isFailed,
} from "~/shared/utils/one-shot";

import type { PageData } from "./use-page-data";

export type StreamLinkState = OneShot<Error, StreamLinkCompleteState>;
type StreamLinkCompleteState =
	| { _tag: "exists" | "found"; url: string }
	| { _tag: "not-found" };

export type LinkChecks = Pick<
	StreamLinkSettings,
	"searchUnvotedLinks" | "hideDownvotedLinks"
>;

const notFound: StreamLinkState = complete({ _tag: "not-found" });

// Returns RYM's link for a service, a search result in its place, or not
// found, following the user's link checks.
export async function getStreamLinkState(
	service: Service & Searchable,
	releaseData: PageData,
	linkChecks: LinkChecks,
): Promise<StreamLinkState> {
	const rymLink = releaseData.links[service.id];
	if (rymLink === undefined) {
		return searchStreamLink(service, releaseData.metadata);
	}

	const rymState = complete({ _tag: "exists" as const, url: rymLink });
	const isDownvoted =
		linkChecks.hideDownvotedLinks &&
		releaseData.servicesWithOnlyDownvotedLinks.includes(service.id);
	const keptState = isDownvoted ? notFound : rymState;
	const isUnvoted =
		linkChecks.searchUnvotedLinks &&
		releaseData.servicesWithoutUpvotedLink.includes(service.id);
	if (!isUnvoted) {
		return keptState;
	}

	const searchState = await searchStreamLink(service, releaseData.metadata);
	if (isFailed(searchState)) {
		return rymState;
	}
	const isFound = isComplete(searchState) && searchState.data._tag === "found";
	return isFound ? searchState : keptState;
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
