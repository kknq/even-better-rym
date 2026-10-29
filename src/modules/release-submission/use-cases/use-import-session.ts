import { useEffect, useState } from "preact/hooks";

import type { ResolveData } from "~/shared/services/types";
import type { ReleaseOptions } from "../utils/types";

export type ImportSession<Session> = {
	count: number;
	session: Session | undefined;
};

// Tracks the session getSession builds from the most recent import, numbered
// so each import gets a fresh panel.
export function useImportSession<Session>(
	getSession: (
		data: ResolveData,
		options: ReleaseOptions,
	) => Session | undefined,
): ImportSession<Session> {
	const [importSession, setImportSession] = useState<ImportSession<Session>>({
		count: 0,
		session: undefined,
	});

	useEffect(() => {
		const reset = () =>
			setImportSession((previous) => ({
				count: previous.count + 1,
				session: undefined,
			}));
		const listener = (
			event: CustomEvent<{ data: ResolveData; options: ReleaseOptions }>,
		) =>
			setImportSession((previous) => ({
				...previous,
				session: getSession(event.detail.data, event.detail.options),
			}));
		document.addEventListener("importEvent", reset);
		document.addEventListener("importCompleteEvent", listener);
		return () => {
			document.removeEventListener("importEvent", reset);
			document.removeEventListener("importCompleteEvent", listener);
		};
	}, [getSession]);

	return importSession;
}
