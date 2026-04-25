export type LiveMixtapesNextData = {
  props?: {
    pageProps?: {
      dehydratedState?: { queries?: LiveMixtapeQuery[] }
      initialMixtape?: {
        data?: LiveMixtapeData
        included?: LiveMixtapeIncluded
      }
    }
  }
}

export type LiveMixtapeQuery = {
  state: {
    data?: {
      data?: LiveMixtapeData[]
      included?: LiveMixtapeIncluded
    }
  }
}

export type LiveMixtapeData = {
  artist?: string
  title: string
  release_date?: string
  uploaded: string
  djs?: LiveMixtapeDj[]
  cover: string
}

export type LiveMixtapeDj = {
  name: string
}

export type LiveMixtapeIncluded = {
  tracks?: LiveMixtapeTrack[]
}

export type LiveMixtapeTrack = {
  title: string
  artist?: string
  duration?: number
}
