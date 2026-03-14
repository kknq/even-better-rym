import { runPage } from '~/shared/page-settings'
import { pages } from '~/shared/pages'

import { injectCollectionFilterButtons } from './app'

const isUserCollection = document.location.pathname.startsWith(
  pages.userCollection,
)

const page = isUserCollection ? pages.userCollection : pages.filmCollection

void runPage(page, () => {
  void injectCollectionFilterButtons()
})
