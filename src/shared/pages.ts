export const pages = {
	streamLinks: "/release/",
	descriptorLinks: "/release/",
	trackTime: "/release/",
	releaseSubmission: "/releases/ac",
	coverArt: "/images/upload",
	streamLinkSubmission: "/submit_media_link",
	userCollection: "/collection",
	filmCollection: "/film_collection",
	userPage: "/~",
	voteHistoryGenres: "/rgenre/vote_history",
	voteHistoryDescriptors: "/rdescriptor/vote_history",
	streamLinkMissing: "/misc/media_link_you_know",
	searchBar: "/",
} as const;

export type PageKey = keyof typeof pages;

export const pageLabels: Record<PageKey, string> = {
	streamLinks: "Attempt to Add Streaming Links",
	descriptorLinks: "Descriptor Links",
	trackTime: "Release Length to Hours Conversion",
	releaseSubmission: "Release Submission Helper",
	coverArt: "Cover Art Submission Helper",
	streamLinkSubmission: "Media Links Submission Helper",
	userCollection: "Music Collection Filters",
	filmCollection: "Film Collection Filters",
	userPage: "User Page Enhancements",
	voteHistoryGenres: "Enhancements for Genre Vote History",
	voteHistoryDescriptors: "Enhancements for Descriptor Vote History",
	streamLinkMissing: 'Filtering in "Media Link You Know" List',
	searchBar: "Search Bar Shortcuts",
};

export const pageGroupLabels: Partial<Record<string, string>> = {
	"/release/": "Release Pages",
	"/releases/ac": "Release Submission",
	"/images/upload": "Cover Art Submission",
	"/submit_media_link": "Media Links Submission",
	"/collection": "Music Collection",
	"/film_collection": "Film Collection",
	"/~": "User Page",
	"/rgenre/vote_history": "Genre Vote History",
	"/rdescriptor/vote_history": "Descriptor Vote History",
	"/misc/media_link_you_know": "Media Link You Know",
	"/": "Global",
};

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
	streamLinkSubmission:
		"Assists with converting Soundcloud and Bandcamp links to embed codes on the media link submission page.",
	userCollection:
		"Adds filters to your music collection page.",
	filmCollection:
		"Adds filters to your film collection page.",
	userPage: "Adds edit buttons for favorite artists and other comments.",
	voteHistoryGenres:
		"Adds a searchable genre selector dropdown to the genre vote history page.",
	voteHistoryDescriptors:
		"Adds a searchable descriptor selector dropdown to the descriptor vote history page.",
	streamLinkMissing:
		'Adds filtering controls to the "Media Link You Know" submission list.',
	searchBar:
		"Adds shortcuts to the site-wide search bar.",
};

// Page keys whose features are global and should not affect the toolbar icon
export const globalPageKeys = new Set<PageKey>(["searchBar"]);
