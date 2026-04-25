import { runPage } from '~/shared/page-settings'
import { pages } from '~/shared/pages'

import { injectCollectionFilterButtons } from './app'

const isUserCollection = document.location.pathname.startsWith(
  pages.userCollection,
)

const pageKey = isUserCollection ? 'userCollection' : 'filmCollection'

void runPage(pageKey, () => {
  void injectCollectionFilterButtons()
})
