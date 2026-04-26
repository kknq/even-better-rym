import { fetch } from '~/shared/utils/fetch'

import type { SearchFunction } from '../types'

type DeezerSearchResponse = {
  data?: { link: string }[]
}

export const search: SearchFunction = async ({ artist, title }) => {
  const response = await fetch({
    url: `https://api.deezer.com/search/album`,
    method: 'GET',
    urlParameters: {
      q: `artist:"${artist}" album:"${title}"`,
    },
  })
  const data = JSON.parse(response) as DeezerSearchResponse
  const album = data?.data?.[0]
  return album ? album.link : undefined
}
