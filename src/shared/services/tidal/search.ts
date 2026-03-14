import { fetch } from '../../utils/fetch'
import type { SearchFunction } from '../types'
import { requestToken } from './auth'

type TidalAlbum = {
  id: string
}

type TidalSearchResponse = {
  data?: {
    relationships?: {
      albums?: {
        data?: TidalAlbum[]
      }
    }
  }
}

export const search: SearchFunction = async ({ artist, title }) => {
  const token = await requestToken()
  const searchQuery = encodeURIComponent(`${artist} ${title}`)
  const response = await fetch({
    url: `https://openapi.tidal.com/v2/searchResults/${searchQuery}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
    urlParameters: {
      explicitFilter: 'INCLUDE',
      countryCode: 'US',
      include: 'albums',
    },
  })

  if (!response || response === '') {
    console.error('[Tidal] Empty response received')
    return undefined
  }

  const data = JSON.parse(response) as TidalSearchResponse
  const albums = data?.data?.relationships?.albums?.data

  if (albums && albums.length > 0) {
    const albumId = albums[0].id
    const url = `https://tidal.com/browse/album/${albumId}`
    console.log('[Tidal] Found album URL:', url)
    return url
  }

  console.log('[Tidal] No albums found')
  return undefined
}
