import { secondsToString, stringToDate } from '../../utils/datetime'
import { fetch } from '../../utils/fetch'
import { getReleaseType } from '../../utils/music'
import { isDefined } from '../../utils/types'
import type { ReleaseLabel, ResolveFunction } from '../types'

type BeatportArtist = {
  name: string
}

type BeatportTrack = {
  name: string
  mix_name?: string
  remixers?: BeatportArtist[]
  artists?: BeatportArtist[]
  length_ms?: number
}

type BeatportQuery = {
  queryKey: unknown[]
  state: { data?: { results?: BeatportTrack[] } }
}

type BeatportNextData = {
  props?: {
    pageProps?: {
      release?: {
        name: string
        artists: BeatportArtist[]
        publish_date: string
        image: { uri: string }
        catalog_number: string
        label: { name: string }
      }
      dehydratedState?: { queries?: BeatportQuery[] }
    }
  }
}

// Helper function to extract and parse JSON data from Next.js script tag
const extractNextData = (document_: Document): BeatportNextData => {
  const scriptElement = document_.querySelector('#__NEXT_DATA__')
  if (!scriptElement?.textContent) {
    throw new Error('Could not find __NEXT_DATA__ script tag')
  }

  try {
    return JSON.parse(scriptElement.textContent) as BeatportNextData
  } catch {
    throw new Error('Failed to parse __NEXT_DATA__ JSON')
  }
}

const getTitle = (nextData: BeatportNextData) => {
  return nextData?.props?.pageProps?.release?.name
}

const getArtists = (nextData: BeatportNextData) => {
  const artists = nextData?.props?.pageProps?.release?.artists ?? []
  return artists.map((artist) => artist.name).filter(isDefined)
}

const getDate = (nextData: BeatportNextData) => {
  const dateString = nextData?.props?.pageProps?.release?.publish_date
  return !dateString ? undefined : stringToDate(dateString)
}

const getTracks = (nextData: BeatportNextData, releaseArtists: string[]) => {
  const queries = nextData?.props?.pageProps?.dehydratedState?.queries ?? []
  const tracksQuery = queries.find(
    (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'tracks',
  )

  const tracks = tracksQuery?.state?.data?.results ?? []

  return tracks.map((track, index) => {
    const position = (index + 1).toString()

    let title = track.name.replace(/\s*feat\..*$/i, "") ?? ''

    if (track.mix_name && track.mix_name.toLowerCase() !== 'original mix') {
      title += ` (${track.mix_name})`
    }

    const remixers = track.remixers ?? []
    if (remixers.length > 0) {
      const remixerNames = remixers.map((remixer) => remixer.name).join(', ')
      if (!title.includes('(')) {
        title += ` (${remixerNames} Remix)`
      }
    }

    const trackArtists = track.artists ?? []
    if (trackArtists.map((artist) => artist.name).join(', ') != releaseArtists.join(', ')) {
      const artistNames = trackArtists.map((artist) => artist.name).join(', ')
      title = `${artistNames} - ${title}`
    }

    let duration: string | undefined
    if (track.length_ms) {
      duration = secondsToString(track.length_ms / 1000)
    }

    return { position, title, duration }
  })
}

const getCoverArt = (nextData: BeatportNextData) => {
  const image = nextData?.props?.pageProps?.release?.image
  if (!image) return []

  const maxSizeUrl = image.uri?.replace(/\/\d+x\d+\//, '/0x0/')
  const originalUrl = image.uri

  return [maxSizeUrl, originalUrl].filter(isDefined)
}

const getLabel = (nextData: BeatportNextData): ReleaseLabel => {
  const release = nextData?.props?.pageProps?.release

  return {
    name: release?.label?.name,
    catno: release?.catalog_number,
  }
}

export const resolve: ResolveFunction = async (url) => {
  const response = await fetch({ url })
  const document_ = new DOMParser().parseFromString(response, 'text/html')

  // Extract and parse the Next.js data
  const nextData = extractNextData(document_)

  const title = getTitle(nextData)
  const artists = getArtists(nextData)
  const date = getDate(nextData)
  const tracks = getTracks(nextData, artists)
  const type = getReleaseType(tracks.length)
  const coverArt = getCoverArt(nextData)
  const label = getLabel(nextData)

  return {
    url,
    title,
    artists,
    date,
    tracks,
    type,
    format: 'lossless digital',
    attributes: ['downloadable', 'streaming'],
    label,
    coverArt,
  }
}
