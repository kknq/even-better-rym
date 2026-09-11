export const pages = {
	streamLinks: "/release/",
	descriptorLinks: "/release/",
	trackTime: "/release/",
	releaseSubmission: "/releases/ac",
	coverArt: "/images/upload",
	discogsCarousel: "/release/",
	whosampled: "/release/",
	wikipedia: "/release/",
	streamLinkSubmission: "/submit_media_link",
	userCollection: "/collection",
	filmCollection: "/film_collection",
	userPage: "/~",
	voteHistoryGenres: "/rgenre/vote_history",
	voteHistoryDescriptors: "/rdescriptor/vote_history",
	streamLinkMissing: "/misc/media_link_you_know",
	searchBar: "/",
	genreChartControls: "/genre/",
	timeline: "/artist/",
	map: "/artist/",
	hideVotes: "/r",
	switchGenreDescriptor: "/r",
	hideRatings: "/",
	hideReviews: "/",
	hideCommentBoxes: "/release/",
	chartShortcuts: "/charts/",
} as const;

export type PageKey = keyof typeof pages;

export const pageLabels: Record<PageKey, string> = {
	streamLinks: "Attempt to Add Streaming Links",
	descriptorLinks: "Descriptor Links",
	trackTime: "Release Length to Hours Conversion",
	releaseSubmission: "Release Submission Helper",
	coverArt: "Cover Art Submission Helper",
	discogsCarousel: "Discogs Release Image Carousel",
	whosampled: "WhoSampled Links",
	wikipedia: "Wikipedia Album Search",
	streamLinkSubmission: "Media Links Submission Helper",
	userCollection: "Music Collection Filters",
	filmCollection: "Film Collection Filters",
	userPage: "User Page Enhancements",
	voteHistoryGenres: "Enhancements for Genre Vote History",
	voteHistoryDescriptors: "Enhancements for Descriptor Vote History",
	streamLinkMissing: 'Filtering in "Media Link You Know" List',
	searchBar: "Search Bar Shortcuts",
	genreChartControls: "Genre Chart Controls",
	timeline: "Artist Timeline",
	map: "Artist Location Map",
	hideVotes: "Hide Votes on Genre/Descriptor Pages",
	switchGenreDescriptor: "Genre/Descriptor Switch Links",
	hideRatings: "Hide Ratings",
	hideReviews: "Hide Reviews",
	hideCommentBoxes: "Hide Comment Boxes",
	chartShortcuts: "Chart Shortcuts",
};

export const featureGroups: readonly (readonly [string, readonly PageKey[]])[] =
	[
		["Search and navigation", ["searchBar"]],
		[
			"Charts",
			[
				"genreChartControls",
				"chartShortcuts",
				"descriptorLinks",
				"switchGenreDescriptor",
			],
		],
		[
			"Release and submission tools",
			[
				"streamLinks",
				"trackTime",
				"releaseSubmission",
				"coverArt",
				"discogsCarousel",
				"streamLinkSubmission",
			],
		],
		["External reference links", ["whosampled", "wikipedia"]],
		[
			"Library and user profiles",
			[
				"userCollection",
				"filmCollection",
				"userPage",
				"streamLinkMissing",
				"voteHistoryGenres",
				"voteHistoryDescriptors",
			],
		],
		["Artist profiles", ["timeline", "map"]],
		[
			"Content visibility",
			["hideRatings", "hideReviews", "hideCommentBoxes", "hideVotes"],
		],
	] as const;

export const pageHints: Record<PageKey, string> = {
	streamLinks:
		"Automatically tries to search Spotify, Apple Music and other services to display missing links on release pages.",
	descriptorLinks:
		"Turns each descriptor tag into a clickable link to the RYM top charts filtered by that descriptor.",
	trackTime:
		"Reformats the tracklist total length from MM:SS to H:MM:SS when the total exceeds one hour.",
	releaseSubmission:
		"Pre-fills the release submission form with data found on the provided page.",
	coverArt: "Adds download controls to the cover art upload page.",
	discogsCarousel:
		"Adds an optional carousel of secondary Discogs release images to music release pages.",
	whosampled: "Adds a direct link to the matching WhoSampled album page.",
	wikipedia: "Adds a Wikipedia search link for the current release.",
	streamLinkSubmission:
		"Assists with converting Soundcloud and Bandcamp links to embed codes on the media link submission page.",
	userCollection: "Adds filters to your music collection page.",
	filmCollection: "Adds filters to your film collection page.",
	userPage: "Adds edit buttons for favorite artists and other comments.",
	voteHistoryGenres:
		"Adds a searchable genre selector dropdown to the genre vote history page.",
	voteHistoryDescriptors:
		"Adds a searchable descriptor selector dropdown to the descriptor vote history page.",
	streamLinkMissing:
		'Adds filtering controls to the "Media Link You Know" submission list.',
	searchBar: "Adds shortcuts to the site-wide search bar.",
	genreChartControls:
		"Adds chart controls to music genre pages and film genre pages, and links film chart genres to their film genre pages.",
	timeline:
		"On artist pages, adds an inline timeline visualizing member activity and discography.",
	map: "On artist pages, adds an interactive map showing concert locations.",
	hideVotes:
		"On genre and descriptor pages, adds toggle buttons to show or hide user votes.",
	switchGenreDescriptor:
		"Adds links to switch between a release's genre and descriptor pages.",
	hideRatings:
		"Hides ratings on supported pages with configurable page and release behavior.",
	hideReviews: "Hides review content on configurable supported pages.",
	hideCommentBoxes: "Hides comment boxes on release pages.",
	chartShortcuts:
		"Adds keyboard shortcuts for applying genre/descriptor matches, toggling sub-genre and 'must contain all' options, and updating the chart to chart pages.",
};

// Page keys whose features are global and should not affect the toolbar icon
export const globalPageKeys = new Set<PageKey>([
	"searchBar",
	"hideRatings",
	"hideReviews",
]);
