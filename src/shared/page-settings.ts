import * as storage from './utils/storage'

export const getPageEnabled = async (page: string): Promise<boolean> =>
  (await storage.get<boolean>(`pages.${page}`)) ?? true

export const setPageEnabled = async (
  page: string,
  enabled: boolean,
): Promise<void> => storage.set(`pages.${page}`, enabled)

export const runPage = async (page: string, callback: () => unknown) => {
  const enabled = await getPageEnabled(page)
  if (!enabled) return

  callback()
}
