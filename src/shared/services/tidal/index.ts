import { withCache } from '~/shared/utils/cache'

import type { Searchable, Service } from '../types'
import TidalIcon from './icon'
import TidalFoundIcon from './icon-found'
import TidalNotFoundIcon from './icon-notfound'
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
