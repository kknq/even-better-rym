import { withCache } from '../../utils/cache'
import type { Resolvable, Searchable, Service } from '../types'
import YoutubeIcon from './icon'
import YoutubeFoundIcon from './icon-found'
import YoutubeNotFoundIcon from './icon-notfound'
import { regex } from './regex'
import { resolve } from './resolve'
import { search } from './search'

export const YouTube: Service & Searchable & Resolvable = {
  id: 'youtube',
  name: 'YouTube',
  regex,
  icon: YoutubeIcon,
  foundIcon: YoutubeFoundIcon,
  notFoundIcon: YoutubeNotFoundIcon,
  search: withCache('youtube-search', search),
  resolve: withCache('youtube-resolve', resolve),
}
