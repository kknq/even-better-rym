import { fetch } from '../../utils/fetch'
import type { SearchFunction } from '../types'

export const search: SearchFunction = async({  artist, title }) => {
    const response = await fetch({
        url: 'https://tidal.com/search/albums',
        method: 'GET',
        urlParameters: {
            q: `${artist} ${title}`
        },
    })

    const html = new DOMParser().parseFromString(response, 'text/html')
    const topResult = html.querySelector('.cell-album')
    if (!topResult) {
        return undefined
    }

    const url = topResult.querySelector('a')?.href
    return url ?? undefined
}