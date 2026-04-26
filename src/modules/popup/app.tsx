import type { CSSProperties } from 'preact'
import { h } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import browser from 'webextension-polyfill'

import { getPageEnabled, setPageEnabled } from '~/shared/page-settings'
import type { PageKey } from '~/shared/pages'
import { pageGroupLabels, pageLabels, pages } from '~/shared/pages'

type FeatureState = Record<PageKey, boolean>

function buildGroups(): [string, PageKey[]][] {
  const map = new Map<string, PageKey[]>()
  for (const key of Object.keys(pages) as PageKey[]) {
    const path = pages[key]
    if (!map.has(path)) map.set(path, [])
    map.get(path)!.push(key)
  }
  return [...map.entries()]
}

const groups = buildGroups()

export function App() {
  const [features, setFeatures] = useState<FeatureState | null>(null)

  useEffect(() => {
    const keys = Object.keys(pages) as PageKey[]
    void Promise.all(
      keys.map(async (key) => {
        const enabled = await getPageEnabled(key)
        return [key, enabled] as const
      }),
    ).then((entries) => {
      setFeatures(Object.fromEntries(entries) as FeatureState)
    })
  }, [])

  const toggle = async (key: PageKey) => {
    if (!features) return
    const next = !features[key]
    await setPageEnabled(key, next)
    setFeatures((prev) => prev && { ...prev, [key]: next })
  }

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <img
          src={browser.runtime.getURL('icons/sonemic-48.png')}
          width={28}
          height={28}
          alt=''
          style={styles.logo}
        />
        <div>
          <div style={styles.title}>EvenBetterRYM</div>
          <div style={styles.subtitle}>RateYourMusic Enhancements</div>
        </div>
      </header>

      <main style={styles.list}>
        {features === null ? (
          <div style={styles.loading}>Loading…</div>
        ) : (
          groups.map(([path, keys]) => {
            const isGroup = keys.length > 1
            return (
              <div key={path} style={isGroup ? styles.card : styles.cardFlat}>
                {isGroup && (
                  <div style={styles.groupHeader}>
                    {pageGroupLabels[path] ?? path}
                  </div>
                )}
                {keys.map((key, i) => (
                  <label
                    key={key}
                    style={{
                      ...styles.row,
                      ...(i < keys.length - 1 ? styles.rowDivider : {}),
                    }}
                  >
                    <span style={styles.label}>{pageLabels[key]}</span>
                    <Toggle
                      checked={features[key]}
                      onChange={() => void toggle(key)}
                    />
                  </label>
                ))}
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
}: Readonly<{
  checked: boolean
  onChange: () => void
}>) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      onClick={onChange}
      style={{
        ...styles.toggle,
        background: checked ? '#4286c4' : '#d0d0d0',
      }}
    >
      <span
        style={{
          ...styles.thumb,
          transform: checked ? 'translateX(18px)' : 'translateX(2px)',
        }}
      />
    </button>
  )
}

const styles = {
  root: {
    width: 340,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
    color: '#1a1a1a',
    background: '#f2f2f2',
  } satisfies CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px',
    background: '#1c1c1c',
    color: '#fff',
  } satisfies CSSProperties,

  logo: {
    borderRadius: 6,
    flexShrink: 0,
  } satisfies CSSProperties,

  title: {
    fontWeight: 700,
    fontSize: 14,
    color: '#fff',
    lineHeight: 1.3,
  } satisfies CSSProperties,

  subtitle: {
    fontSize: 11,
    color: '#888',
    lineHeight: 1.3,
  } satisfies CSSProperties,

  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    padding: '10px 10px',
  } satisfies CSSProperties,

  card: {
    background: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
  } satisfies CSSProperties,

  cardFlat: {
    background: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
  } satisfies CSSProperties,

  groupHeader: {
    padding: '7px 12px 6px',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#4286c4',
    background: '#f0f6fc',
    borderBottom: '1px solid #d8eaf7',
  } satisfies CSSProperties,

  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    cursor: 'pointer',
    userSelect: 'none' as const,
  } satisfies CSSProperties,

  rowDivider: {
    borderBottom: '1px solid #f0f0f0',
  } satisfies CSSProperties,

  label: {
    flex: 1,
    paddingRight: 12,
    lineHeight: 1.45,
    color: '#2a2a2a',
  } satisfies CSSProperties,

  loading: {
    padding: '20px 16px',
    color: '#999',
    textAlign: 'center' as const,
  } satisfies CSSProperties,

  toggle: {
    position: 'relative',
    flexShrink: 0,
    width: 40,
    height: 22,
    border: 'none',
    borderRadius: 11,
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.2s',
  } satisfies CSSProperties,

  thumb: {
    position: 'absolute',
    top: 2,
    left: 0,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
    transition: 'transform 0.2s',
    display: 'block',
  } satisfies CSSProperties,
}
