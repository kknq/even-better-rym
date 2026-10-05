export type CollectionKind = "music" | "film";

const musicSearchTypes = [
	["a", "Artist"],
	["l", "Release"],
	["q", "Review"],
	["g", "Tag"],
	["b", "Label"],
	["h", "Genres"],
	["relyear", "Release Year"],
] as const;

const filmSearchTypes = [
	["F", "Title"],
	["q", "Review"],
	["g", "Tag"],
	["h", "Genres"],
	["relyear", "Release Year"],
] as const;

export function collectionSearchTypes(kind: CollectionKind) {
	return kind === "film" ? filmSearchTypes : musicSearchTypes;
}

export const collectionFilters = {
	search: "Search",
	status: "Ownership status",
	rating: "Rating",
	type: "Release type",
	format: "Format",
	views: "Views",
};
export type CollectionFilter = keyof typeof collectionFilters;

export function isCollectionFilterSupported(
	kind: CollectionKind,
	filter: CollectionFilter,
) {
	return (
		kind === "music" ||
		filter === "search" ||
		filter === "status" ||
		filter === "rating"
	);
}

export const collectionViews = {
	default: "Default",
	visual: "Visual",
	tracks: "Tracks",
	reviews: "Reviews",
	track_ratings: "Track ratings",
};
export type CollectionView = keyof typeof collectionViews;

export function isNamedCollectionView(
	value: string,
): value is Exclude<CollectionView, "default"> {
	return value !== "default" && Object.keys(collectionViews).includes(value);
}

export const collectionColumns = {
	aat: "Cover art",
	a: "Artist",
	l: "Release",
	al: "Artist / release / year",
	albj: "Artist / release / year / label",
	alh: "Artist / release / year / genre",
	albjh: "Artist / release / year / label / genre",
	f: "Film title",
	ts: "Rating (stars)",
	tn: "Rating (number)",
	r: "Date entered",
	q: "Date acquired",
	o: "Ownership / format",
	g: "Tags",
	tl: "Track list",
	v: "Review",
	u: "Username",
	c: "Column number",
};
export type CollectionColumn = keyof typeof collectionColumns;
