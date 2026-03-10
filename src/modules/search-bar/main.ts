import { pages, runPage } from '~/common/pages'

import { main } from '.'

void runPage(pages.searchBar, () => {
  void main()
})
