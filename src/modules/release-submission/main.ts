import { runPage } from '~/shared/page-settings'

import { main } from './app'

await runPage('releaseSubmission', async () => {
  await main()
})
