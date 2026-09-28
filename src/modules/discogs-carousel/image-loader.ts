export const createSecondaryImageLoader = <T>(
	load: () => Promise<T[]>,
): (() => Promise<T[]>) => {
	let cachedImages: T[] | undefined;
	let imageRequest: Promise<T[]> | undefined;

	return () => {
		if (cachedImages) return Promise.resolve(cachedImages);
		imageRequest ??= load()
			.then((images) => {
				if (images.length > 0) {
					cachedImages = images;
				} else {
					imageRequest = undefined;
				}
				return images;
			})
			.catch((error: unknown) => {
				imageRequest = undefined;
				throw error;
			});
		return imageRequest;
	};
};
