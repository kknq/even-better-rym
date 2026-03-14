import type { CSSProperties } from 'preact'
import { h } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import browser from 'webextension-polyfill'

import { getPageEnabled, setPageEnabled } from '../../shared/page-settings'
import type { PageKey } from '../../shared/pages'
import { pageLabels, pages } from '../../shared/pages'

type FeatureState = Record<PageKey, boolean>

export function App() {
  const [features, setFeatures] = useState<FeatureState | null>(null)

  useEffect(() => {
    const keys = Object.keys(pages) as PageKey[]
    void Promise.all(
      keys.map(async (key) => {
        const enabled = await getPageEnabled(pages[key])
        return [key, enabled] as const
      }),
    ).then((entries) => {
      setFeatures(Object.fromEntries(entries) as FeatureState)
    })
  }, [])

  const toggle = async (key: PageKey) => {
    if (!features) return
    const next = !features[key]
    await setPageEnabled(pages[key], next)
    setFeatures((prev) => prev && { ...prev, [key]: next })
  }

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <img
          src={browser.runtime.getURL('icons/sonemic-48.png')}
          width={24}
          height={24}
          alt=''
        />
        <span style={styles.title}>EvenBetterRYM</span>
      </header>

      <main style={styles.list}>
        {features === null ? (
          <div style={styles.loading}>Loading…</div>
        ) : (
          (Object.keys(pages) as PageKey[]).map((key) => (
            <label key={key} style={styles.row}>
              <span style={styles.label}>{pageLabels[key]}</span>
              <Toggle
                checked={features[key]}
                onChange={() => void toggle(key)}
              />
            </label>
          ))
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
        background: checked ? '#4caf50' : '#9e9e9e',
      }}
    >
      <span
        style={{
          ...styles.thumb,
          transform: checked ? 'translateX(16px)' : 'translateX(2px)',
        }}
      />
    </button>
  )
}

const styles = {
  root: {
    width: 320,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
    color: '#212121',
    background: '#fff',
  } satisfies CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderBottom: '1px solid #e0e0e0',
    background: '#f5f5f5',
  } satisfies CSSProperties,

  title: {
    fontWeight: 700,
    fontSize: 14,
  } satisfies CSSProperties,

  list: {
    display: 'flex',
    flexDirection: 'column',
    padding: '4px 0',
  } satisfies CSSProperties,

  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid #f0f0f0',
  } satisfies CSSProperties,

  label: {
    flex: 1,
    paddingRight: 12,
    lineHeight: 1.4,
  } satisfies CSSProperties,

  loading: {
    padding: '16px 14px',
    color: '#9e9e9e',
  } satisfies CSSProperties,

  toggle: {
    position: 'relative',
    flexShrink: 0,
    width: 36,
    height: 20,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.2s',
  } satisfies CSSProperties,

  thumb: {
    position: 'absolute',
    top: 2,
    left: 0,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    transition: 'transform 0.2s',
    display: 'block',
  } satisfies CSSProperties,
}
