import { runPage } from '~/shared/page-settings'

import { main } from './app'

await runPage('streamLinks', async () => {
  await main()
})
