import { withCache } from '~/shared/utils/cache'

import type { Embeddable, Resolvable, Searchable, Service } from '../types'
import { embed } from './embed'
import SoundcloudIcon from './icon'
import SoundcloudFoundIcon from './icon-found'
import SoundcloudNotFoundIcon from './icon-notfound'
import { resolve } from './resolve'
import { search } from './search'

export const Soundcloud: Service & Searchable & Resolvable & Embeddable = {
  id: 'soundcloud',
  name: 'Soundcloud',
  regex: /https?:\/\/(soundcloud\.com\/.*|snd\.sc\/.*)/,
  icon: SoundcloudIcon,
  foundIcon: SoundcloudFoundIcon,
  notFoundIcon: SoundcloudNotFoundIcon,
  search: withCache('soundcloud-search', search),
  resolve: withCache('soundcloud-resolve', resolve),
  embed: withCache('soundcloud-embed', embed),
}
