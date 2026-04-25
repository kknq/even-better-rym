import { runPage } from '~/shared/page-settings'

import { injectCoverArtDownloader } from './app'

void runPage('coverArt', () => {
  void injectCoverArtDownloader()
})
