import DeezerIcon from '../../icons/deezer'
import DeezerFoundIcon from '../../icons/deezer-found'
import DeezerNotFoundIcon from '../../icons/deezer-notfound'
import { withCache } from '../../utils/cache'
import type { Searchable, Service } from '../types'
import { search } from './search'

export const Deezer: Service & Searchable = {
    id: 'deezer',
    name: 'Deezer',
    regex: /https?:\/\/www.deezer\.com\/album\/.*/,
    icon: DeezerIcon,
    foundIcon: DeezerFoundIcon,
    notFoundIcon: DeezerNotFoundIcon,
    search: withCache('deezer-search', search),
}