import { runPage } from '~/shared/page-settings'

import { main } from './app'

await runPage('userPage', async () => {
  await main()
})
