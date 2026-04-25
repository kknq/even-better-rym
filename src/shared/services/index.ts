import { AppleMusic } from './applemusic'
import { Bandcamp } from './bandcamp'
import { Beatport } from './beatport'
import { Deezer } from './deezer'
import { Discogs } from './discogs'
import { LiveMixtapes } from './livemixtapes'
import { Melon } from './melon'
import { Qobuz } from './qobuz'
import { Soundcloud } from './soundcloud'
import { Spotify } from './spotify'
import { Tidal } from './tidal'
import type { Embeddable, Resolvable, Searchable, Service } from './types'
import { isEmbeddable, isResolvable, isSearchable } from './types'
import { YouTube } from './youtube'

export const SERVICES: Service[] = [
  AppleMusic,
  Bandcamp,
  Discogs,
  Soundcloud,
  Spotify,
  YouTube,
  Melon,
  Beatport,
  Deezer,
  Qobuz,
  Tidal,
  LiveMixtapes,
]

export const SEARCHABLES: (Service & Searchable)[] =
  SERVICES.filter(isSearchable)
export const RESOLVABLES: (Service & Resolvable)[] =
  SERVICES.filter(isResolvable)
export const EMBEDDABLES: (Service & Embeddable)[] =
  SERVICES.filter(isEmbeddable)

export const getMatchingService =
  <S extends Service>(services: S[]) =>
  (url: string): S | undefined =>
    services.find((service) => service.regex.test(url))
