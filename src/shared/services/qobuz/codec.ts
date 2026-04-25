export type ReleaseData = {
  '@context': string
  '@type': 'MusicAlbum'
  '@id': string
  url: string
  name: string
  description: string
  datePublished: string
  potentialAction: PotentialAction
}

export type PotentialAction = {
  '@type': 'ListenAction'
  target: Target[]
  expectsAcceptanceOf: Offer
}

export type Target = {
  '@type': 'EntryPoint'
  urlTemplate: string
  actionPlatform: string[]
}

export type Offer = {
  '@type': 'Offer'
  category: string
  elegibleRegion: string[]
}
