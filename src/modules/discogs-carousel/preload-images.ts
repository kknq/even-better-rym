const loadImage = (url: string): Promise<HTMLImageElement> =>
	new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			void image.decode().then(() => resolve(image), reject);
		};
		image.onerror = () =>
			reject(new Error(`Could not load Discogs image: ${url}`));
		image.src = url;
	});

export const preloadImageUrls = async <T>(
	urls: string[],
	preload: (url: string) => Promise<T>,
): Promise<T[]> => {
	const results = await Promise.allSettled(urls.map(preload));
	const images = results.flatMap((result) =>
		result.status === "fulfilled" ? [result.value] : [],
	);
	if (urls.length > 0 && images.length === 0) {
		throw new Error("Could not load Discogs images.");
	}
	return images;
};

export const preloadImages = (urls: string[]): Promise<HTMLImageElement[]> =>
	preloadImageUrls(urls, loadImage);
