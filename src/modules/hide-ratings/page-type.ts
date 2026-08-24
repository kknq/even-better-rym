import type { VisibilityPage } from "~/shared/visibility/settings";

export const getRatingsPageType = (pathname: string): VisibilityPage | null => {
	if (pathname.startsWith("/release/")) return "release";
	if (pathname.startsWith("/film/")) return "film";
	if (pathname.startsWith("/artist/") || pathname.startsWith("/films/"))
		return "artist";
	if (pathname.startsWith("/charts/")) return "chart";
	if (/^\/(?:collection|film_collection)/.test(pathname)) return "collection";
	if (pathname.startsWith("/~")) return "profile";
	if (/^\/(?:music-review|latest)/.test(pathname)) return "review";
	if (/^\/new-music(?:\/|$)/.test(pathname)) return "newMusic";
	if (/^\/(?:genre|film_genre)(?:\/|$)/.test(pathname)) return "genre";
	if (pathname === "/") return "home";
	return null;
};

export const isReleaseReviewList = (pathname: string): boolean =>
	/^\/(?:release|film)\/.+\/reviews(?:\/\d+)?\/?$/.test(pathname);

export const preservesListVisibility = (
	page: VisibilityPage,
	pathname: string,
): boolean =>
	page === "collection" || page === "review" || isReleaseReviewList(pathname);
