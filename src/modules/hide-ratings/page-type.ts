export type RatingsPageType = "release" | "artist" | "browse";

export const getRatingsPageType = (
	pathname: string,
): RatingsPageType | null => {
	if (/^\/(?:release|film)\//.test(pathname)) return "release";
	if (pathname.startsWith("/artist/")) return "artist";

	if (
		pathname === "/" ||
		/^\/(?:new-music|newreleases|charts|collection|film_collection)(?:\/|$)/.test(
			pathname,
		) ||
		pathname.startsWith("/~")
	) {
		return "browse";
	}

	return null;
};
