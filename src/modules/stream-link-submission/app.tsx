import { h, render } from 'preact'

import { waitForElement } from '../../shared/utils/dom'
import { StreamLinkConverter } from './stream-link-converter'

export async function injectStreamLinkConverter() {
  const input = await waitForElement<HTMLInputElement>('input#form_media_url')

  const app = document.createElement('div')
  app.id = 'even-better-rym'
  input.after(app)

  render(<StreamLinkConverter input={input} />, app)
}
