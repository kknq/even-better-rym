import { withCache } from '../../utils/cache'
import type { Resolvable, Searchable, Service } from '../types'
import QobuzIcon from './icon'
import QobuzFoundIcon from './icon-found'
import QobuzNotFoundIcon from './icon-notfound'
import { resolve } from './resolve'
import { search } from './search'

export const Qobuz: Service & Searchable & Resolvable = {
  id: 'qobuz',
  name: 'Qobuz',
  regex: /https?:\/\/.*\.qobuz\.com\/[a-z]{2}-[a-z]{2}\/album\/.*/,
  icon: QobuzIcon,
  foundIcon: QobuzFoundIcon,
  notFoundIcon: QobuzNotFoundIcon,
  search: withCache('qobuz-search', search),
  resolve: withCache('qobuz-resolve', resolve),
}
