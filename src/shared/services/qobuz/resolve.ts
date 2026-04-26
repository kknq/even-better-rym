import { asArray } from '~/shared/utils/array'
import { stringToDate } from '~/shared/utils/datetime'
import { fetch } from '~/shared/utils/fetch'
import { getReleaseType } from '~/shared/utils/music'
import { isDefined } from '~/shared/utils/types'

import type { ReleaseAttribute, ResolveFunction } from '../types'
import type { ReleaseData } from './codec'

const attributes: ReleaseAttribute[] = ['downloadable', 'streaming']

const getArtists = (document_: Document) => {
  return [...document_.querySelectorAll('li.album-meta__item')]
    .filter((li) => li.textContent.includes('Main artists:'))
    .flatMap((li) => [...li.querySelectorAll('a')])
    .map((element) => element.getAttribute('title')?.trim())
    .filter(isDefined)
}

const getCoverArt = (document_: Document) => {
  const url =
    document_.querySelector<HTMLImageElement>('img.album-cover__image')?.src ??
    undefined

  if (!url) return undefined

  return url.replace('_600.jpg', '_max.jpg')
}

const getLabel = (document_: Document) => {
  return [...document_.querySelectorAll('li.album-about__item')]
    .find((li) => li.textContent.includes('Label'))
    ?.querySelector('a')
    ?.textContent?.trim()
}

const getReleaseData = (document_: Document) => {
  const releaseScript = document_.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  )[1]
  if (releaseScript) {
    return JSON.parse(releaseScript.text) as ReleaseData
  }

  throw new Error('Could not get release data for URL ' + document_.URL)
}

const getTracks = (document_: Document) => {
  return [...document_.querySelectorAll('#playerTracks div.track__items')].map(
    (element) => {
      const position = element
        .querySelector('div.track__item--number')
        ?.textContent?.trim()
      const title = element.getAttribute('title')?.trim()
      const duration = normalizeDuration(
        element
          .querySelector('span.track__item--duration')
          ?.textContent?.trim(),
      )
      return { position, title, duration }
    },
  )
}

const normalizeDuration = (extractedDuration: string | undefined) => {
  if (extractedDuration === undefined) return extractedDuration

  const parts = extractedDuration.split(':').map((n) => Number.parseInt(n, 10))

  const [h, m, s] = parts
  return h === 0
    ? `${m}:${s.toString().padStart(2, '0')}`
    : `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export const resolve: ResolveFunction = async (url) => {
  const usUrl = url.replace(/(?<=qobuz\.com\/)[a-z]{2}-[a-z]{2}/, 'us-en')
  const response = await fetch({ url: usUrl })
  const document_ = new DOMParser().parseFromString(response, 'text/html')
  const releaseData = getReleaseData(document_)

  const title = releaseData.name
  const artists = getArtists(document_)
  const date = releaseData.datePublished
    ? stringToDate(releaseData.datePublished)
    : undefined
  const tracks = getTracks(document_)
  const type = getReleaseType(tracks.length)
  const coverArt = asArray(getCoverArt(document_))
  const labelName = getLabel(document_)

  const label = labelName ? { name: labelName } : undefined

  return {
    url: usUrl,
    title,
    artists,
    date,
    type,
    format: 'lossless digital',
    attributes,
    tracks,
    coverArt,
    label,
  }
}
