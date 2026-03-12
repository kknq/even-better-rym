import * as storage from './utils/storage'

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
  timeline: '/artist/',
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
  streamLinkMissing: 'Filtering in "Media Link You Know" (/misc/media_link_you_know) List',
  searchBar: 'Search Bar Shortcuts',
  timeline: 'Timeline for Artist Members'
}

// Page keys whose features are global and should not affect the toolbar icon
export const globalPageKeys = new Set<PageKey>(['searchBar'])

export const getPageEnabled = async (page: string): Promise<boolean> =>
  (await storage.get<boolean>(`pages.${page}`)) ?? true
export const setPageEnabled = async (
  page: string,
  enabled: boolean,
): Promise<void> => storage.set(`pages.${page}`, enabled)

export const runPage = async (page: string, callback: () => unknown) => {
  const enabled = await getPageEnabled(page)
  if (!enabled) return

  callback()
}
