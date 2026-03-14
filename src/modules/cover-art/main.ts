import { runPage } from '~/shared/page-settings'
import { pages } from '~/shared/pages'

import { injectCoverArtDownloader } from './app'

void runPage(pages.coverArt, () => {
  void injectCoverArtDownloader()
})
