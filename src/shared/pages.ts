export const pages = {
  streamLinks: '/release/',
  releaseSubmission: '/releases/ac',
  coverArt: '/images/upload',
  streamLinkSubmission: '/submit_media_link',
  userCollection: '/collection',
  filmCollection: '/film_collection',
  userPage: '/~',
  voteHistoryGenres: '/rgenre/vote_history',
  voteHistoryDescriptors: '/rdescriptor/vote_history',
  streamLinkMissing: '/misc/media_link_you_know',
  searchBar: '/',
} as const

export type PageKey = keyof typeof pages

export const pageLabels: Record<PageKey, string> = {
  streamLinks: 'Attempt to Add Streaming Links on Release Pages',
  releaseSubmission: 'Release Submission Helper',
  coverArt: 'Cover Art Submission Helper',
  streamLinkSubmission: 'Media Links Submission Helper',
  userCollection: 'Music Collection Filters',
  filmCollection: 'Film Collection Filters',
  userPage: 'User Page Enhancements',
  voteHistoryGenres: 'Enhancements for Genre Vote History',
  voteHistoryDescriptors: 'Enhancements for Descriptor Vote History',
  streamLinkMissing:
    'Filtering in "Media Link You Know" (/misc/media_link_you_know) List',
  searchBar: 'Search Bar Shortcuts',
}

// Page keys whose features are global and should not affect the toolbar icon
export const globalPageKeys = new Set<PageKey>(['searchBar'])
