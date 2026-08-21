const CURRENT_USER_SELECTOR =
	".header_profile_logged_in .header_profile_main[href^='/~']";

const normalizeUsername = (username: string): string =>
	decodeURIComponent(username).toLowerCase();

const getUsernameFromPathname = (pathname: string): string | null => {
	const segments = pathname.split("/").filter(Boolean);
	const [section, username] = segments;

	if (section?.startsWith("~")) return section.slice(1);
	if (section === "collection" || section === "film_collection")
		return username;

	return null;
};

export const getCurrentUsername = (): string | null => {
	const href = document
		.querySelector<HTMLAnchorElement>(CURRENT_USER_SELECTOR)
		?.getAttribute("href");

	if (!href) return null;

	return getUsernameFromPathname(
		new URL(href, globalThis.location.origin).pathname,
	);
};

export const isOwnUserPage = (
	pathname: string = globalThis.location.pathname,
): boolean => {
	const currentUsername = getCurrentUsername();
	const pageUsername = getUsernameFromPathname(pathname);

	return (
		currentUsername !== null &&
		pageUsername !== null &&
		normalizeUsername(currentUsername) === normalizeUsername(pageUsername)
	);
};

export const isOwnProfile = (): boolean =>
	isOwnUserPage() ||
	document.querySelector(".profile_set_listening_btn a") !== null;
