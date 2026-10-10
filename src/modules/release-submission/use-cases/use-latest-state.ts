import { useCallback, useRef, useState } from "preact/hooks";

export type LatestState<T> = {
	state: T;
	// Holds the most recently committed state, even before it renders.
	latest: { readonly current: T };
	commit: (next: T) => void;
};

// Returns the state, a ref to its latest value, and a function setting both.
export function useLatestState<T>(initial: () => T): LatestState<T> {
	const [state, setState] = useState(initial);
	const latest = useRef(state);

	const commit = useCallback((next: T) => {
		latest.current = next;
		setState(next);
	}, []);

	return { state, latest, commit };
}
