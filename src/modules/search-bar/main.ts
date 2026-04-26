import { runPage } from '~/shared/page-settings'

import { main } from './app'

await runPage('searchBar', async () => {
  await main()
})
