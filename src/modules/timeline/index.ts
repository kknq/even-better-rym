/*
 * What this script does (high-level):
 * - Runs only on RateYourMusic artist pages: https://rateyourmusic.com/artist/*
 * - Injects a “[timeline]” link next to the “Members” header
 * - Clicking “[timeline]” toggles an inline panel directly beneath the Members section
 * - The panel renders a timeline graph of members vs years:
 *    - Member rows
 *    - Segmented bars for multiple stints (e.g. 1965-66, 1967-69)
 *    - Role-color “stripes” inside each bar
 *    - A role legend
 * - Theme-aware: attempts to match the page’s effective background/text contrast
 *
 * Most recent “upgrade” intent:
 * - Prefer timeline bounds anchored by the page’s “Formed” and “Disbanded” info fields
 *   so the axis reflects the band’s actual active span.
 * - If “Disbanded” exists, clamp the timeline end (and clamp discography markers) so
 *   archival/posthumous releases do NOT extend the chart past disbanding.
 * - If no “Disbanded”, show “Now” as the axis end label.
 * - Strip year-like tokens from roles aggressively so years don’t become “instruments”.
 */

import './timeline.css'

const STYLE_ID = 'rymmt-style'
const PANEL_ID = 'rymmt-panel'
const LINK_CLASS = 'rymmt-link'

// keep your ROLE_CANON + all helpers below (unchanged behavior)

export async function main(): Promise<void> {
  injectLinkIfNeeded()

  const mo = new MutationObserver(() => injectLinkIfNeeded())
  mo.observe(document.documentElement, { childList: true, subtree: true })
}

const markersByType: MarkersByType = {
  album: [],
  live: [],
  single: [],
  ep: [],
}

// Runs only on https://rateyourmusic.com/artist/*

type Nullable<T> = T | null

type RGB = { r: number; g: number; b: number }

type RoleCanonEntry = { key: string; match: RegExp[] }

type MarkerType = 'album' | 'live' | 'single' | 'ep'
type Marker = { year: number; title?: string; href?: string; type: MarkerType }

type DiscoMarker = { year: number; title?: string; url?: string }

type MarkersByType = {
  album: DiscoMarker[]
  live: DiscoMarker[]
  single: DiscoMarker[]
  ep: DiscoMarker[]
}

function toMarkersByType(src: TimelineMarkers): MarkersByType {
  return {
    album: (src.album || []).map((year: number) => ({ year })),
    live: (src.live || []).map((year: number) => ({ year })),
    single: (src.single || []).map((year: number) => ({ year })),
    ep: (src.ep || []).map((year: number) => ({ year })),
  }
}

function extractYearFromYmdSpan(span: Element | null): number | null {
  if (!span) return null
  const y = parseInt((span.textContent || '').trim(), 10)
  return Number.isFinite(y) ? y : null
}

function findMembersHeader(): HTMLElement | null {
  const hdrs = document.querySelectorAll<HTMLElement>('.info_hdr')
  for (const h of hdrs) {
    if ((h.textContent || '').trim() === 'Members') return h
  }
  return null
}

type Stint = { start: number; end: number }

type Member = {
  name: string
  roles: string[]
  stints: Stint[]
  raw: string
  startYear?: number | null
  endYear?: number | null
}

type ParsedMembers = {
  members: Member[]
  maxYearMentioned: number | null
}

type TimelineMarkers = {
  album: number[]
  live: number[]
  single: number[]
  ep: number[]
}

type DiscoType = 'album' | 'live' | 'single' | 'ep'

type Bounds = { formedDate: Date | null; disbandedDate: Date | null }

type TimelineBounds = {
  formedDate: Date | null
  disbandedDate: Date | null
}

type GraphOpts = {
  formedYear?: number | null
  endYear?: number | null
  disbandedYear?: number | null
  markers?: MarkersByType
}

// Role canonicalization: reduce obvious variants so colors stay stable
// e.g. "vox" and "vocal" → "vocals", "synth" → "keyboards", etc.
const ROLE_CANON: RoleCanonEntry[] = [
  // --- Vocals ---
  { key: 'vocals', match: [/^vocals?$/i] },
  {
    key: 'backing vocals',
    match: [/^backing vocals?$/i, /background vocals?/i],
  },
  { key: 'rap', match: [/^rap$/i, /rapper/i] },

  // --- Guitar ---
  { key: 'guitar', match: [/^guitar$/i, /lead guitar/i] },
  { key: 'rhythm guitar', match: [/^rhythm guitar$/i] },
  { key: 'bass', match: [/^bass$/i, /bass guitar/i] },
  { key: 'piccolo bass', match: [/^piccolo bass$/i] },

  // --- Keyboards ---
  { key: 'keyboards', match: [/^keyboards?$/i] },
  { key: 'piano', match: [/^piano$/i] },
  { key: 'toy piano', match: [/^toy piano$/i] },
  { key: 'synthesizer', match: [/^synthesizer$/i, /^synth$/i] },
  {
    key: 'analogue synthesizer',
    match: [/analogue synthesizer/i, /analog synthesizer/i],
  },
  { key: 'ondes martenot', match: [/ondes\s*martenot/i] },
  { key: 'sampler', match: [/^sampler$/i] },
  { key: 'laptop', match: [/^laptop$/i] },
  { key: 'glockenspiel', match: [/^glockenspiel$/i] },

  // --- Drums & Percussion ---
  { key: 'drums', match: [/^drums?$/i] },
  { key: 'percussion', match: [/^percussion$/i] },
  { key: 'congas', match: [/^congas?$/i] },
  { key: 'bongos', match: [/^bongos?$/i] },
  { key: 'timbales', match: [/^timbales?$/i] },

  // --- Brass & Woodwinds ---
  { key: 'saxophone', match: [/^saxophone$/i, /\bsax\b/i] },
  { key: 'trumpet', match: [/^trumpet$/i] },
  { key: 'trombone', match: [/^trombone$/i] },
  { key: 'flute', match: [/^flute$/i] },

  // --- Production ---
  { key: 'producer', match: [/^producer$/i] },
  { key: 'orchestration', match: [/orchestration/i] },
  { key: 'effects', match: [/^effects?$/i] },
]

// Normalize Unicode dash variants to a plain "-"
function normalizeDashes(s: string): string {
  return String(s || '').replace(/[–—−]/g, '-')
}

// true for: "1970", "1970-71", "1965-1969", "1966-67", "1975-76", etc
// Used to identify year tokens so they can be dropped from roles.

function isYearLikeToken(token: string): boolean {
  const t = normalizeDashes(token).trim()
  if (/^\d{4}$/.test(t)) return true
  if (/^\d{4}\s*-\s*(\d{2}|\d{4})$/.test(t)) return true
  return false
}

// Remove empty tokens, year-like tokens, and all-numeric tokens from role arrays.
type RolesInput = string | string[] | null | undefined

function splitRoles(rawRoles: string): string[] {
  const s = normalizeDashes(String(rawRoles || ''))
    // normalize common separators into commas
    .replace(/\s*(\/|;|\+|\|)\s*/g, ',')
    .replace(/\s*&\s*/g, ',')
    .replace(/\s+and\s+/gi, ',')
    .trim()

  if (!s) return []
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

function sanitizeRoles(rawRoles: string[]): string[] {
  const out: string[] = []
  for (const r of rawRoles || []) {
    const t = String(r || '').trim()
    if (!t) continue
    if (isYearLikeToken(t)) continue
    if (/^\d+$/.test(t)) continue
    out.push(t)
  }
  return out
}

function ensureStyles() {
  // Styles are packaged in rymmt.css and loaded via manifest.json (content_scripts[].css).
  // Kept as a no-op for backwards compatibility.
}

// Basic helpers for theme detection (find “effective” background)
function isTransparent(color: string): boolean {
  if (!color) return true
  return color === 'transparent' || color === 'rgba(0, 0, 0, 0)'
}

// Walk up DOM to find first non-transparent background color.

function getEffectiveBackgroundColor(el: HTMLElement | null): string {
  let cur: HTMLElement | null = el
  for (let i = 0; i < 25 && cur; i++) {
    const bg = window.getComputedStyle(cur).backgroundColor
    if (!isTransparent(bg)) return bg
    cur = cur.parentElement
  }
  return (
    window.getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)'
  )
}

function parseRgb(rgb: string): RGB {
  const m = (rgb || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!m) return { r: 255, g: 255, b: 255 }
  return { r: +m[1], g: +m[2], b: +m[3] }
}

// Relative luminance for contrast decisions.
function luminance({ r, g, b }: RGB): number {
  const srgb = [r, g, b].map((v: number) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

// Apply CSS vars to panel so its UI harmonizes with page theme.
function applyRymThemeVars(
  panelEl: HTMLElement,
  headerEl: HTMLElement | null,
): void {
  const bg = getEffectiveBackgroundColor(headerEl || panelEl)
  const rgb = parseRgb(bg)
  const isDark = luminance(rgb) < 0.35

  // Pull a readable text color from page styles
  const bodyColor =
    window.getComputedStyle(document.body).color || 'rgb(220,220,220)'
  const hdrColor = headerEl
    ? window.getComputedStyle(headerEl).color
    : bodyColor

  panelEl.style.setProperty('--rymmt-panel-bg', bg)
  panelEl.style.setProperty('--rymmt-track-bg', bg)

  panelEl.style.setProperty('--rymmt-panel-text', hdrColor)
  panelEl.style.setProperty('--rymmt-track-border', 'rgba(255,255,255,0.55)')
  panelEl.style.setProperty('--rymmt-panel-border', 'rgba(255,255,255,0.45)')
  panelEl.style.setProperty('--rymmt-muted-text', 'rgba(255,255,255,0.85)')

  if (!isDark) {
    panelEl.style.setProperty('--rymmt-track-border', 'rgba(0,0,0,0.35)')
    panelEl.style.setProperty('--rymmt-panel-border', 'rgba(0,0,0,0.35)')
    panelEl.style.setProperty('--rymmt-muted-text', 'rgba(0,0,0,0.65)')
    panelEl.style.setProperty('--rymmt-tick-color', 'rgba(0,0,0,0.18)')
    panelEl.style.setProperty('--rymmt-tick-major-color', 'rgba(0,0,0,0.30)')
    panelEl.style.setProperty('--rymmt-marker-halo', 'rgba(255,255,255,0.55)')
    panelEl.style.setProperty('--rymmt-bar-outline', 'rgba(0,0,0,0.35)')
    panelEl.style.setProperty('--rymmt-album-color', '#000000')
    panelEl.style.setProperty('--rymmt-live-color', '#666666')
  } else {
    panelEl.style.setProperty('--rymmt-album-color', '#ffffff')
    panelEl.style.setProperty('--rymmt-live-color', '#bdbdbd')
  }

  panelEl.dataset.rymmtIsDark = isDark ? '1' : '0'
}
function hasSufficientTimelineData(
  membersHeaderEl: HTMLElement | null,
): boolean {
  const membersContent = membersHeaderEl
    ? findAdjacentInfoContent(membersHeaderEl)
    : null
  if (!membersContent) return false

  const membersText = membersContent.textContent || ''
  const parsed = parseMembersFromText(membersText)

  // "Sufficient" means: at least one explicit stint OR at least one release marker exists.
  const hasAnyExplicitStints = (parsed.members || []).some(
    (m) => Array.isArray(m.stints) && m.stints.length > 0,
  )

  // Discography markers (album/ep/single/live) — ignore post-disband inside extractor already
  const bounds = readFormedAndDisbanded(document)
  const disbandedYear = yearOf(bounds.disbandedDate)

  const markers = extractDiscographyMarkersFromDOM(disbandedYear) || {}

  const anyMarkers =
    (Array.isArray(markers.album) && markers.album.length > 0) ||
    (Array.isArray(markers.ep) && markers.ep.length > 0) ||
    (Array.isArray(markers.single) && markers.single.length > 0) ||
    (Array.isArray(markers.live) && markers.live.length > 0)

  return hasAnyExplicitStints || anyMarkers
}

// Find the “Members” info header.
function findMembersInfoContent() {
  // Find the "Members" header, then its corresponding info_content container.
  const headers = Array.from(document.querySelectorAll('.info_hdr'))
  const membersHdr = headers.find((h) =>
    /^\s*Members\b/i.test(h.textContent || ''),
  )
  if (!membersHdr) return null

  // On RYM, the content is typically the next sibling.
  const content = membersHdr.nextElementSibling
  if (content && content.classList.contains('info_content')) return content

  // Fallback: search near header
  return membersHdr.parentElement?.querySelector('.info_content') || null
}

function insertPanelAfterLastRenderedTextArtist(
  panelEl: HTMLElement,
  headerEl: HTMLElement | null,
): boolean {
  if (!(panelEl instanceof Element)) return false

  const infoContent = headerEl
    ? findAdjacentInfoContent(headerEl)
    : findMembersInfoContent()
  if (!infoContent) return false

  const rendered = Array.from(
    infoContent.querySelectorAll('span.rendered_text'),
  ).filter((span: Element) => !!span.querySelector('a.artist'))

  const anchor = rendered[rendered.length - 1]
  if (!anchor) return false

  anchor.insertAdjacentElement('afterend', panelEl)
  return true
}

// Given an info header, find its next adjacent info_content block.
function findAdjacentInfoContent(headerEl: HTMLElement): HTMLElement | null {
  let el: Element | null = headerEl
  for (let i = 0; i < 12; i++) {
    if (!el) return null

    el = el.nextElementSibling

    if (!el) return null
    if (el.classList?.contains('info_content')) return el as HTMLElement
    if (el.classList?.contains('info_hdr')) return null
  }

  return null
}

// Collapse role names into canonical buckets for stable coloring.
function canonicalRole(role: string): string {
  const r = (role || '').trim().toLowerCase()
  for (const entry of ROLE_CANON) {
    if (entry.match.some((rx) => rx.test(r))) return entry.key
  }
  return r
}

function capitalizeWords(s: string): string {
  return String(s)
    .split(/\s+/)
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Stable color assignment per canonical role (HSL palette, deterministic).
// Note: this is *different* from the older colorForRole() system later in file.
function roleToCssVarKey(canonKey: string): string {
  return `--rymmt-role-${canonKey.replace(/\s+/g, '-')}`
}

function getRoleColor(role: string, isDarkTheme: boolean): string {
  const key = canonicalRole(role)

  // For hard-coded/known roles, return the CSS variable reference.
  // (The var exists in rymmt.css.)
  const known = new Set([
    'keyboards',
    'guitar',
    'rhythm guitar',
    'vocals',
    'backing vocals',
    'congas',
    'drums',
    'timbales',
    'saxophone',
    'bongos',
    'flute',
    'piccolo bass',
    'bass',
    'trumpet',
    'trombone',
    'percussion',
    'rap',
    'producer',
    'piano',
    'toy piano',
    'analogue synthesizer',
    'ondes martenot',
    'laptop',
    'glockenspiel',
    'orchestration',
    'effects',
    'synthesizer',
    'sampler',
  ])

  if (known.has(key)) {
    return `var(${roleToCssVarKey(key)})`
  }

  // Unknown roles: deterministic hash -> HSL
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  const hue = h % 360

  const sat = isDarkTheme ? 70 : 65
  const light = isDarkTheme ? 45 : 40
  return `hsl(${hue} ${sat}% ${light}%)`
}

function parseMembersFromText(text: string): ParsedMembers {
  const src = (text || '').replace(/\s+/g, ' ').trim()
  const re = /([^()]+?)\s*\(([^)]*)\)\s*(?:,|$)/g

  const map = new Map<string, Member>()
  let maxYearMentioned: number | null = null

  function upMax(y: number): void {
    if (Number.isFinite(y))
      maxYearMentioned = Math.max(maxYearMentioned ?? y, y)
  }

  function parseYearToken(tok: string): Stint | null {
    const t = normalizeDashes(tok).trim()
    const curYear = new Date().getFullYear()

    // 1970
    if (/^\d{4}$/.test(t)) {
      const y = parseInt(t, 10)
      return { start: y, end: y }
    }

    // 1966-67 or 1965-1969 or 1970-present
    const m = t.match(/^(\d{4})\s*-\s*(present|\d{2}|\d{4})$/i)
    if (m) {
      const start = parseInt(m[1], 10)
      let end
      const rhs = m[2].toLowerCase()
      if (rhs === 'present') end = curYear
      else if (rhs.length === 2)
        end = Math.floor(start / 100) * 100 + parseInt(rhs, 10)
      else end = parseInt(rhs, 10)
      return { start, end }
    }

    return null
  }

  let m
  while ((m = re.exec(src)) !== null) {
    const name = (m[1] || '').trim()
    let inside = (m[2] || '').trim()
    if (!name) continue

    // Split parentheses content by commas, then classify tokens as:
    // - stints (year tokens)
    // - roles (everything else)
    const tokens = inside
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const stints = []
    const roles = []

    for (const tok of tokens) {
      const y = parseYearToken(tok)
      if (y) {
        stints.push(y)
        upMax(y.end)
      } else {
        roles.push(tok)
      }
    }

    const cleanRoles = sanitizeRoles(roles)

    // If no explicit stints, we still want something sensible:
    // infer a stint if we can from maxYearMentioned later, else skip.
    // (This is why buildGraph has fallback behavior too.)
    const rec = map.get(name) || {
      name,
      roles: [],
      stints: [],
      raw: `${name} (${inside})`,
    }

    // Merge roles (unique-ish)
    for (const r of cleanRoles) {
      if (!rec.roles.includes(r)) rec.roles.push(r)
    }

    // Merge stints
    for (const s of stints) {
      if (!rec.stints.some((t) => t.start === s.start && t.end === s.end)) {
        rec.stints.push(s)
      }
    }

    map.set(name, rec)
  }

  return { members: Array.from(map.values()), maxYearMentioned }
}

// -----------------------------
// Discography helpers (Album / Live Album years)
// -----------------------------

function findDiscoTypeContainerByHeaderLabel(
  label: string,
): HTMLElement | null {
  // Find a discography header matching label, then return its parent container.
  const headers = Array.from(
    document.querySelectorAll<HTMLElement>('.info_hdr'),
  )
  for (const h of headers) {
    const t = (h.textContent || '').trim()
    if (t === label) {
      // Walk up to something that contains items
      let cur: HTMLElement | null = h
      for (let i = 0; i < 10 && cur; i++) {
        if (cur.classList && cur.classList.contains('disco_type_container'))
          return cur
        cur = cur.parentElement
      }
      return h.parentElement
    }
  }

  // Fallback: old markup uses <h3>Album</h3> style sometimes
  const h3s = document.querySelectorAll('h3, h4')
  for (const h of h3s) {
    const t = (h.textContent || '').trim()
    if (t === label) return h.parentElement
  }
  return null
}

function extractYearsFromDiscoContainer(containerEl: Element | null): number[] {
  if (!containerEl) return []
  const years: number[] = []
  // existing body
  return years
}

function uniqueSorted(nums: number[]): number[] {
  return Array.from(
    new Set(nums.filter((n: number) => Number.isFinite(n))),
  ).sort((a: number, b: number) => a - b)
}

// -----------------------------
// Formed / Disbanded extraction
// -----------------------------

function extractFirstYearFromText(s: string): number | null {
  const m = String(s || '').match(/\b(19|20)\d{2}\b/)
  return m ? parseInt(m[0], 10) : null
}

// Read “Formed” and “Disbanded” from artist info fields (.info_hdr / .info_content)
// NOTE: Returns *dates* (or null), not plain numeric years.
function readFormedAndDisbanded(containerRoot: ParentNode | null): Bounds {
  const root = containerRoot || document
  const infoHeaders = Array.from(
    root.querySelectorAll<HTMLElement>('.info_hdr'),
  )
  const result: Bounds = { formedDate: null, disbandedDate: null }

  function extractYear(text: string): number | null {
    const m = String(text || '').match(/\b(19|20)\d{2}\b/)
    return m ? parseInt(m[0], 10) : null
  }

  for (const h of infoHeaders) {
    const label = (h.textContent || '').trim().toLowerCase()
    if (!label) continue

    const contentEl = findAdjacentInfoContent(h)
    if (!contentEl) continue

    const year = extractYear(contentEl.textContent || '')
    if (year === null) continue

    const d = new Date(year, 0, 1)

    if (label === 'formed') result.formedDate = d
    if (label === 'disbanded') result.disbandedDate = d

    if (
      !result.disbandedDate &&
      (label.includes('disband') || label.includes('split'))
    ) {
      result.disbandedDate = d
    }

    if (!result.formedDate && label.includes('form')) {
      result.formedDate = d
    }
  }

  return result
}

// -----------------------------
// Older color mapping functions
// -----------------------------

// Determine a stable role palette from canonical role names.
// This is used mainly for the legend (and sometimes bars).
function colorForRole(role: string): string {
  const r = canonicalRole(role)
  if (r === 'vocals') return '#ff4d6d'
  if (r === 'guitar') return '#22c55e'
  if (r === 'bass') return '#3b82f6'
  if (r === 'drums') return '#f59e0b'
  if (r === 'percussion') return '#fb7185'
  if (r === 'keyboards') return '#a855f7'
  if (r === 'harmonica') return '#eab308'
  if (r === 'sitar') return '#84cc16'

  // Deterministic fallback
  let hash = 0
  for (let i = 0; i < r.length; i++) hash = (hash * 33 + r.charCodeAt(i)) >>> 0
  const hue = hash % 360
  return `hsl(${hue} 70% 45%)`
}

// -----------------------------
// Graph builder
// -----------------------------

function normalizeDiscoLabel(
  label: string | null | undefined,
): DiscoType | null {
  const t = String(label || '')
    .trim()
    .toLowerCase()
  if (t === 'album' || t === 'albums') return 'album'
  if (t === 'live album' || t === 'live albums') return 'live'
  if (t === 'single' || t === 'singles') return 'single'
  if (t === 'ep' || t === 'eps') return 'ep'
  return null
}

function extractDiscographyMarkersFromDOM(
  disbandedYear: number | null,
): TimelineMarkers {
  const out: TimelineMarkers = { album: [], live: [], single: [], ep: [] }

  const discographyRoot = document.getElementById('discography')
  if (!discographyRoot) return out

  const sectionHeaders = Array.from(
    discographyRoot.querySelectorAll<HTMLElement>('.disco_header_top'),
  )

  for (const header of sectionHeaders) {
    const labelEl = header.querySelector<HTMLElement>('h3.disco_header_label')
    const kind = normalizeDiscoLabel(labelEl?.textContent || '')
    if (!kind) continue

    let node: Element | null = header.nextElementSibling
    while (node && !node.classList.contains('disco_header_top')) {
      if (node.classList.contains('disco_release')) {
        const yearSpan = node.querySelector(
          '.disco_year_ymd, .disco_year_ym, .disco_year_y',
        )
        const y = extractYearFromYmdSpan(yearSpan)
        if (y !== null) {
          if (disbandedYear === null || y <= disbandedYear) {
            out[kind].push(y)
          }
        }
      }
      node = node.nextElementSibling
    }
  }

  for (const k of Object.keys(out) as (keyof TimelineMarkers)[]) {
    out[k] = Array.from(new Set(out[k])).sort((a, b) => a - b)
  }

  return out
}

function renderIntoPanel(
  panelEl: HTMLElement,
  headerEl: HTMLElement | null,
): void {
  const membersContent = headerEl ? findAdjacentInfoContent(headerEl) : null

  const membersText = membersContent ? membersContent.textContent : ''
  const parsed = parseMembersFromText(membersText)

  const bounds = readFormedAndDisbanded(document)
  const formedYear = yearOf(bounds.formedDate)
  const disbandedYear = yearOf(bounds.disbandedDate)

  // NEW: get grouped discography markers from #discography
  const disco = extractDiscographyMarkersFromDOM(disbandedYear)

  // Decide endYear:
  const latestAnyRelease = Math.max(
    disco.album.length ? disco.album[disco.album.length - 1] : -Infinity,
    disco.live.length ? disco.live[disco.live.length - 1] : -Infinity,
    disco.single.length ? disco.single[disco.single.length - 1] : -Infinity,
    disco.ep.length ? disco.ep[disco.ep.length - 1] : -Infinity,
  )

  const mentionedYear =
  typeof parsed.maxYearMentioned === 'number' ? parsed.maxYearMentioned : -Infinity

const endYear = Number.isFinite(disbandedYear)
  ? disbandedYear
  : Math.max(
      Number.isFinite(latestAnyRelease) ? latestAnyRelease : -Infinity,
      mentionedYear,
      new Date().getFullYear(),
    )

  panelEl.innerHTML = ''
  buildGraph(panelEl, parsed.members, {
    formedYear,
    endYear,
    disbandedYear,
    markers: toMarkersByType(disco),
  })
}

function togglePanel(headerEl: HTMLElement | null): void {
  try {
    // Reuse existing panel if present
    let panel = document.getElementById(PANEL_ID)

    // Create panel if missing
    if (!panel) {
      panel = document.createElement('div')
      panel.id = PANEL_ID
      panel.className = 'rymmt-panel rymmt-hidden' // start hidden; CSS class controls visibility
    }

    // If panel is not in DOM yet, insert it
    if (!document.body.contains(panel)) {
      const inserted = insertPanelAfterLastRenderedTextArtist(panel, headerEl)

      if (!inserted) {
        // fallback: keep it visible somewhere so you can debug
        ;(document.querySelector('#content') || document.body).appendChild(
          panel,
        )
      }
    }

    // If we're opening, (re)render
    const isHidden = panel.classList.contains('rymmt-hidden')
    if (isHidden) {
      panel.classList.remove('rymmt-hidden')
      applyRymThemeVars(panel, headerEl)
      renderIntoPanel(panel, headerEl)
    } else {
      panel.classList.add('rymmt-hidden')
    }
  } catch (e) {
    console.error('[RYMMT] togglePanel error:', e)
  }
}

function buildTicksHtml(axisMin: number, axisMax: number): string {
  // Build vertical tick marks across the track.
  // (Major ticks every 5 years, minor ticks every 1 year.)
  const total = axisMax - axisMin || 1
  const years = []
  for (let y = axisMin; y <= axisMax; y++) years.push(y)

  const html = years
    .map((y) => {
      const left = ((y - axisMin) / total) * 100
      const major = y % 5 === 0
      const cls = major ? 'rymmt-tick rymmt-tick-major' : 'rymmt-tick'
      return `<div class="${cls}" style="left:${left}%"></div>`
    })
    .join('')

  return html
}

function buildMarkersOverlayHtml(
  axisMin: number,
  axisMax: number,
  markers?: MarkersByType,
): string {
  const m: MarkersByType = markers ?? {
    album: [],
    live: [],
    single: [],
    ep: [],
  }

  const album = m.album
  const live = m.live
  const ep = m.ep
  const single = m.single

  const total = axisMax - axisMin || 1

  function linesFor(list: DiscoMarker[], cls: string): string {
    return list
      .filter((x) => x && Number.isFinite(x.year))
      .filter((x) => x.year >= axisMin && x.year <= axisMax)
      .map((x) => {
        const left = ((x.year - axisMin) / total) * 100
        const title = x.title ? `${x.year} — ${x.title}` : String(x.year)

        return x.url
          ? `<a class="rymmt-marker ${cls}" href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer" style="left:${left}%" title="${escapeHtml(title)}"></a>`
          : `<div class="rymmt-marker ${cls}" style="left:${left}%" title="${escapeHtml(title)}"></div>`
      })
      .join('')
  }

  return `<div class="rymmt-markers">
    ${linesFor(album, 'album')}
    ${linesFor(live, 'live')}
    ${linesFor(ep, 'ep')}
    ${linesFor(single, 'single')}
  </div>`
}

function escapeHtml(s: string): string {
  if (s == null) return ''
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c] as string,
  )
}

function yearOf(d: Date | null): number | null {
  return d instanceof Date && !Number.isNaN(d.getTime())
    ? d.getFullYear()
    : null
}

function injectLinkIfNeeded(): void {
  const membersHeaderEl = findMembersHeader()
  if (!membersHeaderEl) return

  const existing = membersHeaderEl.querySelector(`.${LINK_CLASS}`)
  if (existing) return

  const link = document.createElement('span')
  link.className = LINK_CLASS
  link.textContent = '[timeline]'
  link.addEventListener('click', () => {
    togglePanel(membersHeaderEl)
  })

  membersHeaderEl.appendChild(link)
}

function buildGraph(
  container: HTMLElement,
  members: Member[],
  opts: GraphOpts = {},
): void {
  const isDarkTheme = container?.dataset?.rymmtIsDark === '1'
  ensureStyles()

  const nowYear = new Date().getFullYear()

  const formedYear = Number.isFinite(opts.formedYear)
    ? Number(opts.formedYear)
    : null

  const disbandedYear = Number.isFinite(opts.disbandedYear)
    ? Number(opts.disbandedYear)
    : null

  const markerYears: number[] = [
    ...(opts.markers?.album ?? []).map((m) => m.year),
    ...(opts.markers?.live ?? []).map((m) => m.year),
    ...(opts.markers?.single ?? []).map((m) => m.year),
    ...(opts.markers?.ep ?? []).map((m) => m.year),
  ]

  let axisMin: number = formedYear ?? NaN
  let axisMax: number =
    disbandedYear ??
    (Number.isFinite(opts.endYear) ? Number(opts.endYear) : nowYear)

  const allYears: number[] = [...markerYears]

  for (const m of members || []) {
    if (Array.isArray(m.stints)) {
      for (const s of m.stints) {
        if (Number.isFinite(s.start)) allYears.push(s.start)
        if (Number.isFinite(s.end)) allYears.push(s.end)
      }
    }
  }

  if (!Number.isFinite(axisMin)) {
    axisMin = allYears.length ? Math.min(...allYears) : nowYear - 60
  }

  if (!Number.isFinite(axisMax)) {
    axisMax = allYears.length ? Math.max(...allYears) : nowYear
  }

  if (axisMin > axisMax) {
    const tmp = axisMin
    axisMin = axisMax
    axisMax = tmp
  }

  const normalizedMembers: Member[] = (members || []).map((m: Member) => {
    const stints: Stint[] = Array.isArray(m.stints) ? m.stints.slice() : []

    let startYear: number | null = null
    let endYear: number | null = null

    if (stints.length) {
      const stintStarts = stints
        .map((s: Stint) => s.start)
        .filter((n: number) => Number.isFinite(n))
      const stintEnds = stints
        .map((s: Stint) => s.end)
        .filter((n: number) => Number.isFinite(n))

      startYear = stintStarts.length ? Math.min(...stintStarts) : null
      endYear = stintEnds.length ? Math.max(...stintEnds) : null
    }

    if (!Number.isFinite(startYear)) startYear = axisMin
    if (!Number.isFinite(endYear)) endYear = axisMax

    const clampedStints: Stint[] = stints
      .map((s: Stint) => ({
        start: Math.max(axisMin, Number.isFinite(s.start) ? s.start : axisMin),
        end: Math.min(axisMax, Number.isFinite(s.end) ? s.end : axisMax),
      }))
      .filter((s: Stint) => s.end >= s.start)

    return {
      ...m,
      roles: Array.isArray(m.roles) ? m.roles : [],
      stints: clampedStints.length ? clampedStints : stints,
      startYear,
      endYear,
    }
  })

  const allRoles = new Set<string>()
  normalizedMembers.forEach((m: Member) =>
    (m.roles || []).forEach((r: string) => allRoles.add(r)),
  )

  const roleList = Array.from(allRoles).sort((a: string, b: string) =>
    a.localeCompare(b),
  )

  const legendHtml = roleList
    .map((r: string) => {
      const c = getRoleColor(r, isDarkTheme)
      return `<span class="rymmt-role-chip">
        <span class="rymmt-role-swatch" style="background:${c}"></span>
        ${escapeHtml(capitalizeWords(r))}
      </span>`
    })
    .join('')

  const releasesLegendHtml = `
    <span class="rymmt-role-chip">
      <span class="rymmt-role-swatch" style="background:var(--rymmt-album-color)"></span>
      Albums
    </span>
    <span class="rymmt-role-chip">
      <span class="rymmt-role-swatch" style="background:var(--rymmt-live-color)"></span>
      Live Albums
    </span>
    <span class="rymmt-role-chip">
      <span class="rymmt-role-swatch rymmt-release-single"></span>
      Singles
    </span>
    <span class="rymmt-role-chip">
      <span class="rymmt-role-swatch rymmt-release-ep"></span>
      EPs
    </span>
  `

  const safeAxisMin: number = Number.isFinite(axisMin) ? axisMin : nowYear - 60
  const safeAxisMax: number = Number.isFinite(axisMax) ? axisMax : nowYear
  const ticksHtml = buildTicksHtml(safeAxisMin, safeAxisMax)

  const markersOverlayHtml = buildMarkersOverlayHtml(
    safeAxisMin,
    safeAxisMax,
    opts.markers,
  )

  const titleHtml = `<div class="rymmt-graph-title">Timeline</div>`
  const total = axisMax - axisMin || 1

  const rowsHtml = normalizedMembers
    .map((mem: Member) => {
      const stripes =
        mem.roles && mem.roles.length
          ? mem.roles
              .map(
                (r: string) =>
                  `<div class="rymmt-stripe" title="${escapeHtml(r)}" style="background:${getRoleColor(r, isDarkTheme)}"></div>`,
              )
              .join('')
          : `<div class="rymmt-stripe rymmt-stripe-neutral"></div>`

      const fallbackStart =
        Number.isFinite(mem.startYear) && mem.startYear != null
          ? mem.startYear
          : safeAxisMin

      const fallbackEnd =
        Number.isFinite(mem.endYear) && mem.endYear != null
          ? mem.endYear
          : safeAxisMax

      const stints: Stint[] =
        Array.isArray(mem.stints) && mem.stints.length
          ? mem.stints
              .filter(
                (s): s is Stint =>
                  !!s && Number.isFinite(s.start) && Number.isFinite(s.end),
              )
              .map((s) => ({
                start: s.start,
                end: s.end,
              }))
          : [{ start: fallbackStart, end: fallbackEnd }]

      const bars = stints
        .map((st: Stint) => {
          const s = Number.isFinite(st.start) ? st.start : axisMin
          const e = Number.isFinite(st.end) ? st.end : axisMax

          let left = ((s - axisMin) / total) * 100
          let width = ((e - s) / total) * 100

          if (!Number.isFinite(left)) left = 0
          if (!Number.isFinite(width) || width <= 0) width = 0.8
          if (left < 0) left = 0
          if (left > 100) left = 100
          if (width > 100) width = 100

          return `<div class="rymmt-bar" style="left:${left}%; width:${width}%;" title="${escapeHtml(mem.raw)}">${stripes}</div>`
        })
        .join('')

      return `<div class="rymmt-row">
        <div class="rymmt-name">${escapeHtml(mem.name)}</div>
        <div class="rymmt-track">${ticksHtml}${bars}</div>
      </div>`
    })
    .join('\n')

  const axisEndLabel = Number.isFinite(disbandedYear) ? String(axisMax) : 'Now'

  const axisHtml = `<div class="rymmt-axis">
    <div></div>
    <div class="rymmt-axis-track">
      <span>${escapeHtml(String(axisMin))}</span>
      <span>${escapeHtml(axisEndLabel)}</span>
    </div>
  </div>`

  container.innerHTML = `
    <div class="rymmt-graph">
      ${titleHtml}
      <div class="rymmt-grid rymmt-grid-has-overlay">
        ${markersOverlayHtml}
        ${rowsHtml}
      </div>
      ${axisHtml}
      <div class="rymmt-legend-section">
        <div class="rymmt-legend-title">Roles</div>
        <div class="rymmt-role-legend">${legendHtml}</div>
      </div>
      <div class="rymmt-legend-section">
        <div class="rymmt-legend-title">Releases</div>
        <div class="rymmt-role-legend">${releasesLegendHtml}</div>
      </div>
    </div>
  `
}
