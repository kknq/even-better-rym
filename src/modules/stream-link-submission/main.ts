import { runPage } from '~/shared/page-settings'
import { pages } from '~/shared/pages'

import { injectStreamLinkConverter } from './app'

void runPage(pages.streamLinkSubmission, () => {
  void injectStreamLinkConverter()
})
