// The snapshots before the current one, the current one, and those undone.
export type EditHistory<T> = {
	past: T[];
	current: T;
	future: T[];
};

// Returns a history holding only the initial snapshot.
export const createEditHistory = <T>(initial: T): EditHistory<T> => ({
	past: [],
	current: initial,
	future: [],
});

// Returns the history with snapshot as a new undoable step, dropping
// anything undone.
export const recordEdit = <T>(
	history: EditHistory<T>,
	snapshot: T,
): EditHistory<T> => ({
	past: [...history.past, history.current],
	current: snapshot,
	future: [],
});

// Returns the history with its current snapshot replaced, adding no step.
export const replaceCurrent = <T>(
	history: EditHistory<T>,
	snapshot: T,
): EditHistory<T> => ({ ...history, current: snapshot });

export const canUndo = <T>(history: EditHistory<T>): boolean =>
	history.past.length > 0;

export const canRedo = <T>(history: EditHistory<T>): boolean =>
	history.future.length > 0;

// Returns the history stepped back one snapshot, if there is one.
export const undoEdit = <T>(history: EditHistory<T>): EditHistory<T> => {
	const previous = history.past.at(-1);
	if (previous === undefined) {
		return history;
	}
	return {
		past: history.past.slice(0, -1),
		current: previous,
		future: [history.current, ...history.future],
	};
};

// Returns the history stepped forward one undone snapshot, if there is one.
export const redoEdit = <T>(history: EditHistory<T>): EditHistory<T> => {
	const next = history.future.at(0);
	if (next === undefined) {
		return history;
	}
	return {
		past: [...history.past, history.current],
		current: next,
		future: history.future.slice(1),
	};
};
