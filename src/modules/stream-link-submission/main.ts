import { runPage } from '~/shared/page-settings'

import { injectStreamLinkConverter } from './app'

void runPage('streamLinkSubmission', () => {
  void injectStreamLinkConverter()
})
