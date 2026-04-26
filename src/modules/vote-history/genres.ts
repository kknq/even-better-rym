import { runPage } from '~/shared/page-settings'

import addGenreDropdown from './use-cases/add-genre-dropdown'
import fixPaginationParameters from './use-cases/fix-pagination-parameters'

async function main() {
  await Promise.all([fixPaginationParameters(), addGenreDropdown()])
}

await runPage('voteHistoryGenres', async () => {
  await main()
})
