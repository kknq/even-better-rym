import { useCallback, useEffect, useState } from "preact/hooks";

import type { Searchable, Service } from "~/shared/services/types";
import {
	failed,
	initial,
	isComplete,
	isFailed,
	isLoading,
	loading,
} from "~/shared/utils/one-shot";

import { StreamLinkIcon } from "./stream-link-icon";
import type { StreamLinkState } from "./stream-link-state";
import { getStreamLinkState } from "./stream-link-state";
import type { PageDataState } from "./use-page-data";

export function StreamLink({
	service,
	pageData,
	color,
}: Readonly<{
	service: Service & Searchable;
	pageData: PageDataState;
	color?: string;
}>) {
	const [state, setState] = useState<StreamLinkState>(initial);

	useEffect(() => {
		void (async () => {
			if (isLoading(pageData)) {
				setState(loading);
			} else if (isFailed(pageData)) {
				setState(failed(pageData.error));
			} else if (isComplete(pageData)) {
				setState(await getStreamLinkState(service, pageData.data));
			}
		})();
	}, [pageData, service]);

	const renderIcon = useCallback(
		() => <StreamLinkIcon service={service} state={state} color={color} />,
		[service, state, color],
	);

	// if we have a link available, wrap in an anchor element
	if (
		isComplete(state) &&
		(state.data._tag === "exists" || state.data._tag === "found")
	)
		return (
			<a href={state.data.url} target="_blank" rel="noreferrer">
				{renderIcon()}
			</a>
		);

	return renderIcon();
}
