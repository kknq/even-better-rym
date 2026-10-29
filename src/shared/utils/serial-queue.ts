export type SerialQueue = (task: () => Promise<void>) => Promise<void>;

// Returns a queue that starts each task once the previous one has settled,
// even if it failed.
export const createSerialQueue = (): SerialQueue => {
	let pending: Promise<void> = Promise.resolve();
	return (task) => {
		pending = pending.then(task, task);
		return pending;
	};
};
