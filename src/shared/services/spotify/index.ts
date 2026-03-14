import { withCache } from '../../utils/cache'
import type { Resolvable, Searchable, Service } from '../types'
import SpotifyIcon from './icon'
import SpotifyFoundIcon from './icon-found'
import SpotifyNotFoundIcon from './icon-notfound'
import { regex } from './regex'
import { resolve } from './resolve'
import { search } from './search'

export const Spotify: Service & Searchable & Resolvable = {
  id: 'spotify',
  name: 'Spotify',
  regex,
  icon: SpotifyIcon,
  foundIcon: SpotifyFoundIcon,
  notFoundIcon: SpotifyNotFoundIcon,
  search: withCache('spotify-search', search),
  resolve,
}
