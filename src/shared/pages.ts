export const pages = {
	streamLinks: "/release/",
	descriptorLinks: "/release/",
	trackTime: "/release/",
	releaseComments: "/release/",
	releaseSubmission: "/releases/ac",
	artistSubmission: "/artist/profile_ac",
	coverArt: "/images/upload",
	userReception: "/release/",
	whoSampled: "/release/",
	wikipedia: "/release/",
	discogsCarousel: "/release/",
	streamLinkSubmission: "/submit_media_link",
	userCollection: "/collection",
	filmCollection: "/film_collection",
	userPage: "/~",
	followStatus: ["/~", "/friends/", "/account/friends"],
	listComments: "/list/",
	voteHistoryGenres: "/rgenre/vote_history",
	voteHistoryDescriptors: "/rdescriptor/vote_history",
	streamLinkMissing: "/misc/media_link_you_know",
	searchBar: "/",
	searchFocus: "/",
	genreChartControls: "/genre/",
	artistSearchHint: "/artist/",
	discographyProgress: "/artist/",
	discographySort: "/artist/",
	discographyOrder: "/artist/",
	timeline: "/artist/",
	map: "/artist/",
	hideVotes: "/r",
	switchGenreDescriptor: "/r",
	hideRatings: "/",
	hideReviews: "/",
	hideCommentBoxes: "/release/",
	chartShortcuts: "/charts/",
	imageCropper: "/admin/imaq/crop",
} as const;

export type PageKey = keyof typeof pages;

export const pageLabels: Record<PageKey, string> = {
	streamLinks: "Suggested Streaming Links",
	descriptorLinks: "Descriptor Links",
	trackTime: "Release Length to Hours Conversion",
	releaseComments: "Load All Release Comments",
	releaseSubmission: "Release Submission Helper",
	artistSubmission: "Artist Location Clear Buttons",
	coverArt: "Cover Art Submission Helper",
	userReception: "User Reception",
	whoSampled: "WhoSampled Link",
	wikipedia: "Wikipedia Search",
	discogsCarousel: "Discogs Release Image Carousel",
	streamLinkSubmission: "Media Links Submission Helper",
	userCollection: "Music Collection Enhancements",
	filmCollection: "Film Collection Enhancements",
	userPage: "Profile Edit Boxes",
	followStatus: "Follow Status",
	listComments: "List Comment Enhancements",
	voteHistoryGenres: "Enhancements for Music and Film Genre Vote History",
	voteHistoryDescriptors: "Enhancements for Descriptor Vote History",
	streamLinkMissing: 'Filtering in "Media Link You Know" List',
	searchBar: "Search Bar Shortcuts",
	searchFocus: "Focus Search",
	genreChartControls: "Genre Chart Controls",
	artistSearchHint: "Artist Search Hint",
	discographyProgress: "Discography Progress",
	discographySort: "Keep Discography Sorting",
	discographyOrder: "Discography Section Order",
	timeline: "Artist Timeline",
	map: "Artist Location Map",
	hideVotes: "Hide Votes on Genre/Descriptor Pages",
	switchGenreDescriptor: "Genre/Descriptor Switch Links",
	hideRatings: "Hide Ratings",
	hideReviews: "Hide Reviews",
	hideCommentBoxes: "Hide Comment Boxes",
	chartShortcuts: "Chart Shortcuts",
	imageCropper: "Image Cropper Controls",
};

export const featureGroups: readonly (readonly [string, readonly PageKey[]])[] =
	[
		["Search and navigation", ["searchBar", "searchFocus"]],
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
				"releaseComments",
				"releaseSubmission",
				"imageCropper",
				"coverArt",
				"discogsCarousel",
				"streamLinkSubmission",
			],
		],
		["Release insights", ["userReception"]],
		["External reference links", ["whoSampled", "wikipedia"]],
		[
			"Library and user profiles",
			[
				"userCollection",
				"filmCollection",
				"userPage",
				"followStatus",
				"listComments",
				"streamLinkMissing",
				"voteHistoryGenres",
				"voteHistoryDescriptors",
			],
		],
		[
			"Artist profiles",
			[
				"artistSearchHint",
				"discographyProgress",
				"discographySort",
				"discographyOrder",
				"timeline",
				"map",
				"artistSubmission",
			],
		],
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
	releaseComments:
		"Loads all release comments in batches with a random 750-850 ms pause between requests. Click Stop loading to stop the loop.",
	releaseSubmission:
		"Pre-fills the release submission form with data found on the provided page.",
	artistSubmission:
		"Adds clear buttons for origin, current, and relevant locations when submitting or editing artist profiles.",
	coverArt: "Adds download controls to the cover art upload page.",
	userReception:
		"Summarizes the release's rating distribution into a user reception meter and ranked categories.",
	whoSampled: "Adds a direct WhoSampled album link for the current release.",
	wikipedia: "Adds a button to search for the current release on Wikipedia.",
	discogsCarousel:
		"Adds an optional carousel of secondary Discogs release images to music release pages.",
	streamLinkSubmission:
		"Assists with converting Soundcloud and Bandcamp links to embed codes on the media link submission page.",
	userCollection:
		"Adds configurable filters, columns, and page-size controls to music collections.",
	filmCollection:
		"Adds configurable filters, columns, and page-size controls to film collections.",
	userPage:
		"Adds edit buttons for favorite artists and other comments on your profile.",
	followStatus:
		"Shows whether users follow you on profiles, in your friends list, and beside friends' activity and online status, with a one-minute cache.",
	listComments:
		"Makes list comments wider and taller, improves readability, enlarges the editor, and adds top/bottom scroll controls.",
	voteHistoryGenres:
		"Adds history navigation and a searchable genre selector dropdown to music and film genre vote history pages.",
	voteHistoryDescriptors:
		"Adds history navigation and a searchable descriptor selector dropdown to the descriptor vote history page.",
	streamLinkMissing:
		'Adds filtering controls to the "Media Link You Know" submission list.',
	searchBar: "Adds shortcuts to the site-wide search bar.",
	searchFocus:
		"Press / to open and focus the site-wide search bar when not typing in another field.",
	genreChartControls:
		"Adds chart controls to music genre pages and film genre pages, and links film chart genres to their film genre pages.",
	artistSearchHint: "Shows the artist's search hint below their name",
	discographyProgress:
		"Shows listening progress by release type and overall on artist pages. Configure which release types count toward overall coverage.",
	discographySort:
		"On artist pages, keeps your chosen discography sort when showing all releases in a section, and keeps expanded sections open after sorting.",
	discographyOrder:
		"On artist pages, shows discography sections in your preferred order, for example additional releases above singles.",
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
	imageCropper: "Adds +/- 10 and 50 pixel controls to the image crop editor.",
};

// Page keys whose features are global and should not affect the toolbar icon
export const globalPageKeys = new Set<PageKey>([
	"searchBar",
	"searchFocus",
	"hideRatings",
	"hideReviews",
]);
