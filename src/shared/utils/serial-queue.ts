export type SerialQueue = (task: () => Promise<void>) => Promise<void>;

// Returns a queue that starts each task once the previous one has settled,
// even if it failed.
export const createSerialQueue = (): SerialQueue => {
	let pending: Promise<void> = Promise.resolve();
	return (task) => {
		const result = pending.then(() => task());
		// Keep the queue usable after a failure; the caller still receives it.
		pending = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	};
};
