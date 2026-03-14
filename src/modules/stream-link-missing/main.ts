import { runPage } from '~/shared/page-settings'
import { pages } from '~/shared/pages'

import { main } from './app'

void runPage(pages.streamLinkMissing, () => {
  void main()
})
