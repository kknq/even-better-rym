export type BeatportNextData = {
  props?: {
    pageProps?: {
      release?: {
        name: string
        artists: BeatportArtist[]
        publish_date: string
        image: { uri: string }
        catalog_number: string
        label: { name: string }
      }
      dehydratedState?: { queries?: BeatportQuery[] }
    }
  }
}

export type BeatportArtist = {
  name: string
}

export type BeatportQuery = {
  queryKey: unknown[]
  state: { data?: { results?: BeatportTrack[] } }
}

export type BeatportTrack = {
  name: string
  mix_name?: string
  remixers?: BeatportArtist[]
  artists?: BeatportArtist[]
  length_ms?: number
}
