import { fetch } from '../../utils/fetch'
import type { SearchFunction } from '../types'

export const search: SearchFunction = async({  artist, title }) => {
    const response = await fetch({
        url: `https://api.deezer.com/search/album`,
        method: 'GET',
        urlParameters: {
            q: `artist:"${artist}" album:"${title}"`
        },
    })
    const data = typeof response === 'string' ? JSON.parse(response) : response

    const album = data?.data?.[0]
    
    return album ? album.link : undefined
}