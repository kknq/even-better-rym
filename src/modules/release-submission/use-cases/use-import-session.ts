import { useEffect, useState } from "preact/hooks";

import type { ResolveData } from "~/shared/services/types";

export type ImportSession<Session> = {
	count: number;
	session: Session | undefined;
};

// Tracks the session getSession builds from the most recent import, numbered
// so each import gets a fresh panel.
export function useImportSession<Session>(
	getSession: (data: ResolveData) => Session | undefined,
): ImportSession<Session> {
	const [importSession, setImportSession] = useState<ImportSession<Session>>({
		count: 0,
		session: undefined,
	});

	useEffect(() => {
		const listener = (event: CustomEvent<ResolveData>) =>
			setImportSession((previous) => ({
				count: previous.count + 1,
				session: getSession(event.detail),
			}));
		document.addEventListener("importEvent", listener);
		return () => document.removeEventListener("importEvent", listener);
	}, [getSession]);

	return importSession;
}
