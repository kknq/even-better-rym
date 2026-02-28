import TidalFoundIcon from '../../icons/tidal-found'
import TidalIcon from '../../icons/tidal'
import TidalNotFoundIcon from '../../icons/tidal-notfound'
import { withCache } from '../../utils/cache'
import type { Searchable, Service } from '../types'
import { search } from './search'

export const Tidal: Service & Searchable = {
    id: 'tidal',
    name: 'Tidal',
    regex: /https?:\/\/.*\.tidal\.com\/album\/.*/,
    icon: TidalIcon,
    foundIcon: TidalFoundIcon,
    notFoundIcon: TidalNotFoundIcon,
    search: withCache('tidal-search', search),
}