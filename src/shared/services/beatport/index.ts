import { withCache } from '~/shared/utils/cache'

import type { Resolvable, Service } from '../types'
import BeatportIcon from './icon'
import { resolve } from './resolve'

export const Beatport: Service & Resolvable = {
  id: 'beatport',
  name: 'Beatport',
  regex: /https?:\/\/www\.beatport\.com\/release\/.+\/(\d+)/,
  icon: BeatportIcon,
  resolve: withCache('beatport-resolve', resolve),
}
