import { runPage } from '~/shared/page-settings'
import { pages } from '~/shared/pages'

import addGenreDropdown from './use-cases/add-genre-dropdown'
import fixPaginationParameters from './use-cases/fix-pagination-parameters'

async function main() {
  await Promise.all([fixPaginationParameters(), addGenreDropdown()])
}

void runPage(pages.voteHistoryGenres, () => {
  void main()
})
