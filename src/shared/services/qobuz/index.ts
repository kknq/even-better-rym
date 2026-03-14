import { withCache } from '../../utils/cache'
import type { Searchable, Service } from '../types'
import QobuzIcon from './icon'
import QobuzFoundIcon from './icon-found'
import QobuzNotFoundIcon from './icon-notfound'
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
