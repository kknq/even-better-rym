import { runPage } from '~/shared/page-settings'
import { pages } from '~/shared/pages'

import addDescriptorDropdown from './use-cases/add-descriptor-dropdown'
import fixPaginationParameters from './use-cases/fix-pagination-parameters'

async function main() {
  await Promise.all([fixPaginationParameters(), addDescriptorDropdown()])
}

void runPage(pages.voteHistoryDescriptors, () => {
  void main()
})
