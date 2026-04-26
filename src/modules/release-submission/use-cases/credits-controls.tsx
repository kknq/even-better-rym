import { render } from 'preact'
import { useCallback, useEffect, useState } from 'preact/hooks'

import { equals, uniqueBy } from '~/shared/utils/array'
import {
  forceQuerySelector,
  waitForElement,
  waitForResult,
} from '~/shared/utils/dom'
import { pipe } from '~/shared/utils/pipe'
import { isDefined } from '~/shared/utils/types'

import { selectShortcut } from '../utils/page-functions'

export default async function injectCreditsControls() {
  const credits = await waitForElement('#creditlist')
  const unknownArtistDiv = document.createElement('div')
  credits.after(unknownArtistDiv)
  render(<Credits />, unknownArtistDiv)
}

function parseIntOrUndefined(value: string): number | undefined {
  const n = Number.parseInt(value)
  return Number.isNaN(n) ? undefined : n
}

function parseArtistIdFromInput(result: Element): number | undefined {
  const value = result.querySelector<HTMLInputElement>('input')?.value
  if (!value) return undefined
  const match = /\[Artist(\d+)]/.exec(value)
  if (!match?.[1]) return undefined
  return parseIntOrUndefined(match[1])
}

function parseArtistNode(result: Element): Artist | undefined {
  const artistLink = result.querySelector<HTMLAnchorElement>('a.artist')
  if (artistLink === null) return undefined

  const name = artistLink.text
  const idFromTitle = parseIntOrUndefined(artistLink.title.slice(7, -1))
  const id = idFromTitle ?? parseArtistIdFromInput(result)
  if (id === undefined) return undefined

  return { id, name }
}

function Credits() {
  const [filedUnderArtists, setFiledUnderArtists] = useState<Artist[]>([])
  const [selectedText, trackNumber] = useSelectedText()

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!document.body) return

      const artists: Artist[] = pipe(
        document.querySelectorAll<HTMLAnchorElement>(
          '.sortable_filed_under .filed_under_artist',
        ),
        (nodeList) => [...nodeList],
        (nodes) => nodes.map(parseArtistNode).filter(isDefined),
        uniqueBy((artist) => artist.id),
      )

      if (!equals(artists, filedUnderArtists)) {
        setFiledUnderArtists(artists)
      }
    })

    observer.observe(document, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [filedUnderArtists])

  const handleClick = useCallback(
    (artist: Artist) => selectShortcut('a', artist.id, artist.name, 'credits'),
    [],
  )

  const handleCredit = useCallback(
    (selectedText: string, type: string, trackNumber: string) => {
      void (async () => {
        await fillArtist(selectedText, type, trackNumber)
      })()
    },
    [],
  )

  return (
    <div style={{ marginBottom: '-0.25em' }}>
      {filedUnderArtists.map((artist) => (
        <input
          key={artist.id}
          type='button'
          className='btn'
          value={`+ ${artist.name}`}
          onClick={() => handleClick(artist)}
          style={{
            fontSize: '14px !important',
            marginBottom: '0.25em',
          }}
        />
      ))}
      {selectedText && (
        <input
          key={'featured'}
          type='button'
          className='btn'
          value={`+ featuring ${selectedText}`}
          onClick={() =>
            handleCredit(selectedText, 'featured', trackNumber || '')
          }
          style={{
            fontSize: '14px !important',
            marginBottom: '0.25em',
          }}
        />
      )}
      {selectedText && (
        <input
          key={'featured'}
          type='button'
          className='btn'
          value={`+ remixer ${selectedText}`}
          onClick={() =>
            handleCredit(selectedText, 'remixer', trackNumber || '')
          }
          style={{
            fontSize: '14px !important',
            marginBottom: '0.25em',
          }}
        />
      )}
    </div>
  )
}

type Artist = {
  id: number
  name: string
}

function useSelectedText() {
  const [selectedText, setSelectedText] = useState('')
  const [trackNumber, setTrackNumber] = useState('')

  const [trackTitleInputs, setTrackTitleInputs] = useState<
    (HTMLInputElement | HTMLTextAreaElement)[]
  >([])
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!document.body) return

      const trackTitleInputs: (HTMLInputElement | HTMLTextAreaElement)[] = [
        ...document.querySelectorAll<HTMLInputElement>(
          'input[id^="track_track_title"]',
        ),
      ]

      const advancedInput = document.querySelector<HTMLTextAreaElement>(
        'textarea#track_advanced',
      )
      if (advancedInput) {
        trackTitleInputs.push(advancedInput)
      }

      setTrackTitleInputs(trackTitleInputs)
    })

    observer.observe(document, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleChange = (e: Event) => {
      const isInput = e.target instanceof HTMLInputElement
      const isTextArea = e.target instanceof HTMLTextAreaElement
      if (!(isInput || isTextArea)) return

      const selStart = e.target.selectionStart
      const selEnd = e.target.selectionEnd
      if (selStart === null || selEnd === null) return

      const selText = e.target.value.slice(selStart, selEnd)

      // QOL: don't show gigantic helper buttons if you've selected the entire advanced view textarea
      if (selText.includes('\n')) return

      setSelectedText(selText)

      if (isInput) {
        const trackNumInput =
          e.target.parentElement?.parentElement?.children[1]?.firstChild
        const trackNum =
          trackNumInput && trackNumInput instanceof HTMLInputElement
            ? trackNumInput.value
            : ''
        setTrackNumber(trackNum)
      } else {
        const lastLineStart =
          e.target.value.slice(0, selStart).lastIndexOf('\n') + 1

        const nextLineStartTemp = e.target.value.slice(selStart).indexOf('\n')
        const nextLineStart =
          nextLineStartTemp === -1
            ? e.target.value.length
            : nextLineStartTemp + selStart

        const line = e.target.value.slice(lastLineStart, nextLineStart)

        const split = line.split('|')
        const trackNum = split[0]
        setTrackNumber(trackNum ?? '')
      }
    }

    for (const trackTitleInput of trackTitleInputs) {
      trackTitleInput.addEventListener('select', handleChange)
    }

    return () => {
      for (const trackTitleInput of trackTitleInputs) {
        trackTitleInput.removeEventListener('select', handleChange)
      }
    }
  }, [trackTitleInputs])

  return [selectedText, trackNumber]
}

const fillArtist = async (
  artist: string,
  type: string,
  trackNumber: string,
) => {
  // Enter search term
  forceQuerySelector<HTMLInputElement>(document)('#credit_searchterm').value =
    artist

  // Click search button
  forceQuerySelector<HTMLInputElement>(document)(
    '#section_credits .gosearch input[type=button]',
  ).click()

  // Wait for results
  const topResult = await waitForResult(
    forceQuerySelector<HTMLIFrameElement>(document)('#creditlist'),
  )

  // Click the top result if there is one
  if (topResult) {
    topResult.click()

    // Set the other meta
    forceQuerySelector<HTMLInputElement>(document)(
      '#creditsx li:last-child .credits_roles input',
    ).value = type
    forceQuerySelector<HTMLInputElement>(document)(
      '#creditsx li:last-child .credits_tracks input',
    ).value = trackNumber
  }
}
