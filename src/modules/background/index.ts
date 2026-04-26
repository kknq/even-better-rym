import browser from 'webextension-polyfill'

import { getPageEnabled } from '~/shared/page-settings'
import type { PageKey } from '~/shared/pages'
import { globalPageKeys, pages } from '~/shared/pages'
import type { BackgroundResponse } from '~/shared/utils/messaging'
import { isBackgroundRequest } from '~/shared/utils/messaging'

import { download } from './download'
import { backgroundFetch } from './fetch'
import { script } from './script'

const getResponse = (
  message: unknown,
  tabId: number,
): Promise<BackgroundResponse> => {
  if (isBackgroundRequest(message)) {
    if (message.type === 'fetch') return backgroundFetch(message)
    if (message.type === 'download') return download(message)
    if (message.type === 'script') return script(message, tabId)
  }
  throw new Error(`Invalid message: ${JSON.stringify(message)}`)
}

browser.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id
  if (tabId === undefined) return undefined

  void getResponse(message, tabId).then((response) =>
    browser.tabs.sendMessage(tabId, response),
  )
})

const setTabIcon = (tabId: number, enabled: boolean) => {
  void browser.action.setIcon({
    tabId,
    path: enabled
      ? {
          '19': browser.runtime.getURL('icons/extension-enabled-19.png'),
          '38': browser.runtime.getURL('icons/extension-enabled-38.png'),
        }
      : {
          '19': browser.runtime.getURL('icons/extension-disabled-19.png'),
          '38': browser.runtime.getURL('icons/extension-disabled-38.png'),
        },
  })
  void browser.action.setTitle({
    tabId,
    title: `EvenBetterRYM ${enabled ? 'enabled' : 'disabled'}`,
  })
}

browser.tabs.onUpdated.addListener((id, changeInfo, tab) => {
  if (!tab.url) return
  const url = new URL(tab.url)
  if (!url.hostname.endsWith('rateyourmusic.com')) return

  const pageEntries = (Object.entries(pages) as [PageKey, string][]).filter(
    ([key]) => !globalPageKeys.has(key),
  )

  const matchingKeys = pageEntries
    .filter(([, pageUrl]) => url.pathname.startsWith(pageUrl))
    .map(([key]) => key)

  if (matchingKeys.length === 0) return

  void Promise.all(matchingKeys.map((key) => getPageEnabled(key))).then(
    (results) => {
      const enabled = results.some(Boolean)
      setTabIcon(id, enabled)
      void browser.action.enable(id)
    },
  )
})
