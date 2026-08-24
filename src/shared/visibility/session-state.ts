type VisibilityFeature = "ratings" | "reviews";

const getVisibilitySessionPath = (pathname: string): string => {
	const segments = pathname.split("/").filter(Boolean);
	const [section, username] = segments;
	if ((section === "collection" || section === "film_collection") && username) {
		return `/collection/${username.toLowerCase()}`;
	}

	return pathname.replace(/\/reviews\/\d+\/?$/, "/reviews/");
};

export const getVisibilitySessionKey = (
	feature: VisibilityFeature,
	pathname: string,
): string => `ebr.visibility.${feature}.${getVisibilitySessionPath(pathname)}`;

export const getSessionVisibility = (
	feature: VisibilityFeature,
	pathname: string,
): boolean | null => {
	const value = globalThis.sessionStorage.getItem(
		getVisibilitySessionKey(feature, pathname),
	);
	if (value === "shown") return true;
	if (value === "hidden") return false;
	return null;
};

export const setSessionVisibility = (
	feature: VisibilityFeature,
	pathname: string,
	visible: boolean,
): void => {
	globalThis.sessionStorage.setItem(
		getVisibilitySessionKey(feature, pathname),
		visible ? "shown" : "hidden",
	);
};
