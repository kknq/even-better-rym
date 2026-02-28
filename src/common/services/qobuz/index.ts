import QobuzIcon from '../../icons/qobuz'
import QobuzFoundIcon from '../../icons/qobuz-found'
import QobuzNotFoundIcon from '../../icons/qobuz-notfound'
import { withCache } from '../../utils/cache'
import type { Searchable, Service } from '../types'
import { search } from './search'

export const Qobuz: Service & Searchable = {
    id: 'qobuz',
    name: 'Qobuz',
    regex: /https?:\/\/open\.qobuz\.com\/album\//,
    icon: QobuzIcon,
    foundIcon: QobuzFoundIcon,
    notFoundIcon: QobuzNotFoundIcon,
    search: withCache('qobuz-search', search),
}