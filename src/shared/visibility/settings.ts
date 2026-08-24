export const visibilityPages = [
	"release",
	"film",
	"artist",
	"chart",
	"collection",
	"profile",
	"review",
	"home",
	"newMusic",
	"genre",
] as const;

export type VisibilityPage = (typeof visibilityPages)[number];
export type VisibilityPageSettings = Record<VisibilityPage, boolean>;
export const reviewVisibilityPages = [
	"release",
	"film",
	"collection",
	"profile",
	"review",
	"home",
] as const;
export type ReviewVisibilityPage = (typeof reviewVisibilityPages)[number];
export type ReviewPageSettings = Record<ReviewVisibilityPage, boolean>;

export type RatingVisibility = "always" | "unrated";
export type RatingCountVisibility = "scores" | "scores-and-counts";
export type FriendRatingVisibility = "always" | "after-release-rated" | "never";
export type TrackRatingVisibility = "after-release-rated" | "after-track-rated";
export type FriendReviewVisibility = "always" | "after-release-rated" | "never";
export type ReviewVisibility = "always" | "unrated";

export type RatingSettings = {
	pages: VisibilityPageSettings;
	ratings: RatingVisibility;
	counts: RatingCountVisibility;
	friends: FriendRatingVisibility;
	tracks: TrackRatingVisibility;
	buttons: boolean;
	globalButton: boolean;
};

export type ReviewSettings = {
	pages: ReviewPageSettings;
	reviews: ReviewVisibility;
	friends: FriendReviewVisibility;
	buttons: boolean;
	globalButton: boolean;
};

type RatingSettingsOverrides = Omit<
	Partial<RatingSettings>,
	"friends" | "pages"
> & {
	friends?: FriendRatingVisibility | "hide";
	pages?: Partial<VisibilityPageSettings> & {
		discovery?: boolean;
		other?: boolean;
	};
};

type ReviewSettingsOverrides = Omit<
	Partial<ReviewSettings>,
	"friends" | "pages"
> & {
	friends?: FriendReviewVisibility;
	pages?: Partial<ReviewPageSettings> & {
		discovery?: boolean;
		other?: boolean;
	};
};

const RATINGS_STORAGE_KEY = "brym.visibility.ratings";
const REVIEWS_STORAGE_KEY = "brym.visibility.reviews";

export const defaultPageSettings = (): VisibilityPageSettings =>
	Object.fromEntries(
		visibilityPages.map((page) => [page, true]),
	) as VisibilityPageSettings;

export const defaultReviewPageSettings = (): ReviewPageSettings =>
	({
		...Object.fromEntries(reviewVisibilityPages.map((page) => [page, true])),
		home: false,
	}) as ReviewPageSettings;

export const defaultRatingSettings = (): RatingSettings => ({
	pages: defaultPageSettings(),
	ratings: "unrated",
	counts: "scores",
	friends: "after-release-rated",
	tracks: "after-release-rated",
	buttons: true,
	globalButton: false,
});

export const defaultReviewSettings = (): ReviewSettings => ({
	pages: defaultReviewPageSettings(),
	reviews: "always",
	friends: "always",
	buttons: true,
	globalButton: false,
});

export function mergeRatingSettings(
	overrides: RatingSettingsOverrides = {},
): RatingSettings {
	const defaults = defaultRatingSettings();
	const { discovery, other: _other, ...pages } = overrides.pages ?? {};
	return {
		...defaults,
		...overrides,
		friends:
			overrides.friends === "always" || overrides.friends === "never"
				? overrides.friends
				: defaults.friends,
		pages: {
			...defaults.pages,
			home: discovery ?? defaults.pages.home,
			newMusic:
				pages.newMusic ?? pages.home ?? discovery ?? defaults.pages.newMusic,
			genre: discovery ?? defaults.pages.genre,
			film: pages.film ?? pages.release ?? defaults.pages.film,
			...pages,
		},
	};
}

export function mergeReviewSettings(
	overrides: ReviewSettingsOverrides = {},
): ReviewSettings {
	const defaults = defaultReviewSettings();
	const { discovery, other: _other, ...pages } = overrides.pages ?? {};
	return {
		...defaults,
		...overrides,
		friends:
			overrides.friends === "always" || overrides.friends === "never"
				? overrides.friends
				: defaults.friends,
		pages: {
			...defaults.pages,
			home: discovery ?? defaults.pages.home,
			film: pages.film ?? pages.release ?? defaults.pages.film,
			...pages,
		},
	};
}

export const getRatingSettings = async (): Promise<RatingSettings> => {
	const storage = await import("~/shared/utils/storage");
	return mergeRatingSettings(
		await storage.get<RatingSettingsOverrides>(RATINGS_STORAGE_KEY),
	);
};

export const setRatingSettings = async (
	settings: RatingSettings,
): Promise<void> => {
	const storage = await import("~/shared/utils/storage");
	await storage.set(RATINGS_STORAGE_KEY, settings);
};

export const getReviewSettings = async (): Promise<ReviewSettings> => {
	const storage = await import("~/shared/utils/storage");
	return mergeReviewSettings(
		await storage.get<ReviewSettingsOverrides>(REVIEWS_STORAGE_KEY),
	);
};

export const setReviewSettings = async (
	settings: ReviewSettings,
): Promise<void> => {
	const storage = await import("~/shared/utils/storage");
	await storage.set(REVIEWS_STORAGE_KEY, settings);
};
