import { waitForElement } from '~/shared/utils/dom'

export async function main() {
  const row = await waitForElement<HTMLTableRowElement>(
    'tr.release_descriptors',
  )

  const priSpan = row.querySelector<HTMLSpanElement>(
    'span.release_pri_descriptors',
  )
  if (priSpan) {
    priSpan.style.display = 'none'
  }

  const metas = row.querySelectorAll<HTMLMetaElement>('meta')

  metas.forEach((meta, i) => {
    const content = meta.getAttribute('content')
    if (!content) return

    const cleaned = content.replace(/^\s+/, '').replaceAll(/\s+/g, '-')
    const url = `https://rateyourmusic.com/charts/top/album/all-time/d:${cleaned}`

    const link = document.createElement('a')
    link.href = url
    link.textContent = content
    link.style.fontSize = '.9em'
    link.style.lineHeight = '1.4'
    link.style.textDecoration = 'underline var(--mono-b)'
    link.style.color = 'var(--mono-6)'

    const wrapper = document.createElement('span')
    wrapper.appendChild(link)
    if (i < metas.length - 1) {
      wrapper.appendChild(document.createTextNode(', '))
      wrapper.style.color = 'var(--mono-6)'
    }

    meta.replaceWith(wrapper)
  })
}
