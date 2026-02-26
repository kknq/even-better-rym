import { fetch } from '../../utils/fetch'
import type { SearchFunction } from '../types'

export const search: SearchFunction = async({  artist, title }) => {
    const response = await fetch({
        url: `https://www.qobuz.com/us-en/search/albums/${artist} ${title}`,
        method: 'GET',
    })

    const html = new DOMParser().parseFromString(response, 'text/html')
    const topResult = html.querySelector('.ReleaseCard')
    if (!topResult) {
        return undefined
    }

    const url = topResult.querySelector('a')?.href

    const album_id = url?.substring(url?.lastIndexOf('/'))
    const streaming_url = `https://open.qobuz.com/album${album_id}`

    return streaming_url ?? undefined
}