# even-better-rym

A browser extension that adds quality-of-life improvements to [RateYourMusic](https://rateyourmusic.com). Forked from the original [better-rym](https://github.com/jgchk/better-rym) to keep things maintained and moving forward. Contributions welcome.

Most of the credit goes to [jgchk](https://github.com/jgchk) and all the beautiful people who maintained and improved it over the years.

## Features

Turn each feature on or off from the extension popup. Settings are grouped by purpose: Search and navigation, Charts, Release and submission tools, Library and user profiles, Artist profiles, and Content visibility.

---

### Attempt to Add Streaming Links on Release Pages

Shows links to supported streaming services below the cover art. Existing RYM links are used first; otherwise, the extension looks for a matching release.

---

### Release Submission Helper

Paste a supported music-service link to fill in a release submission faster. It can bring in release details and cover art, and adds handy buttons for dates, labels, catalogue numbers, track lengths, and credits.

---

### Cover Art Submission Helper

Download cover art from a supported service with a pasted link. The artwork source is filled in for you, too.

---

### Discogs Release Image Carousel

On music release pages, looks up the selected release issue on Discogs using its catalogue number and displays the matching secondary release images in a navigable carousel. The feature is enabled by default and can be disabled from the extension popup. Requests use Discogs' public API; releases without matching secondary images show an empty state.

---

### Descriptor Links on Release Pages

Makes descriptors clickable so you can explore charts for each one.

---

### Genre Chart Controls

Adds chart type, release type, and date controls to music genre pages; adds chart controls to film genre pages; and links film-chart genres to their corresponding film genre pages. The year chooser is generated from the current year, so it stays up to date automatically.

---

### Track Time Conversion on Release Pages

Displays album lengths over an hour in a clearer hours-and-minutes format.

---

### Media Links Submission Helper

Helps turn supported music-service links into the embed codes needed for media-link submissions.

---

### Music/Film Collection Filters

Adds one-click filters for status, rating, and release type to your music and film collections.

---

### User Page Enhancements

Lets you edit your favorite artists and other comments directly from your profile page.

---

### Enhancements for Genre Vote History

Adds an easy genre picker and keeps your view settings when moving between pages.

---

### Enhancements for Descriptor Vote History

Adds an easy descriptor picker and keeps your view settings when moving between pages.

---

### Media Link You Know Filters

Adds filters and search to the list of releases missing streaming links.

---

### Artist Timeline

Adds a timeline to group pages so you can see when members were active and what they played. Artist pages with shows also include a map of concert locations, including solo artists.

---

### Search Bar Shortcuts

Lets you use RYM markup, such as `[Artist67]` or `[Album42]`, to go straight to a page from the search bar.

---

### Hide Votes on Genre and Descriptor Pages

Lets you show or hide user votes on genre and descriptor pages. Configure genre and descriptor votes independently to start hidden or shown.

---

### Genre/Descriptor Switch Links

Adds links on release genre and descriptor pages to switch between their genre and descriptor views.

---

### Hide Ratings

Hides community rating values while preserving page layout. Configure the supported pages and whether ratings are hidden only until you rate a release or at all times; a toggle reveals them on demand.

- **Release pages** (`/release/*`, `/film/*`) — Ratings remain visible when you have rated the release; otherwise, averages, rankings, review ratings, and track scores are hidden.
- **Artist pages** (`/artist/*`) — Ratings remain visible only for releases you have rated. Lazy-loaded discography entries follow the current toggle state.
- **Charts, homepage, and new releases** — Available rating values are hidden because the page does not provide per-release rating status for the current user.
- **Profiles, collections, and collection reviews** — Ratings remain visible for your own pages and are hidden on other users' pages.

---

### Hide Reviews

Hides review text on supported release, film, collection, profile, review, and homepage views. Configure the covered pages, whether reviews stay visible after rating a release, and when friends' reviews remain visible. Per-page controls let you reveal reviews when needed.

---

### Hide Comment Boxes

Hides comment boxes on music release and film pages.

---

### Chart Shortcuts

On the chart-builder page (`/charts/`), adds keyboard shortcuts to the genre/descriptor search field so you can build a chart query without touching the mouse - e.g. type a genre, then press a shortcut to include or exclude it, toggle its sub-genres, or require all selected terms to match. A "Show shortcut hints" toggle next to the search field lists every current shortcut and what it does.

The default modifier is Control on macOS and Alt elsewhere - Ctrl+letter (and Ctrl+1-8, which switches tabs in Chrome/Firefox) is heavily claimed by browser/OS shortcuts on Windows/Linux. Every shortcut is fully customizable:

- In the extension popup, click **Customize shortcuts** next to the Chart Shortcuts toggle to open the shortcut editor.
- Click the **+** next to any action to record a new key combo - just press the keys you want. Shortcuts must include Ctrl, Alt, or Cmd, so they don't interfere with typing in the search field.
- Click **×** on an existing combo to remove it. An action can have more than one combo bound to it.
- If a combo is already used by another action, the editor tells you which one, rather than silently overwriting it.
- **Reset all to defaults** restores every shortcut to its original binding.
- Rebinding takes effect immediately on any chart page you already have open - no refresh needed.
- Your custom shortcuts persist across browser restarts.

---

## Development

### Prerequisites

```sh
npm install
```

### Environment Variables

Create a `.env` file in the project root. The following variables are required for Spotify, Tidal and YouTube features to work:

```
VITE_SPOTIFY_ID=
VITE_SPOTIFY_SECRET=
VITE_TIDAL_ID=
VITE_TIDAL_SECRET=
VITE_YOUTUBE_KEY=
```

Discogs also has an auth block, but it seems to work without any keys

### Manifest Version

The extension supports both Manifest V2 and V3. Manifest V3 is the default and primary target for ongoing development; set the `MANIFEST_VERSION` environment variable only when you specifically need to test or build the older MV2 variant:

```
MANIFEST_VERSION=2
```

### Commands

### Git Hooks

Husky installs the repository's pre-commit hooks through the `prepare` script.

#### Watch mode (recommended for development)

Rebuilds the extension on every file change. After each rebuild, reload the extension in your browser's extension manager and refresh the page.

```sh
npm run watch
```

#### HMR mode

Applies changes inline without a full rebuild. Only works in Chromium-based browsers and can have issues with CORS.

```sh
npm run dev
```

> Manifest V3 HMR requires Chromium >= 110.0.5480.0.

#### Production build

```sh
npm run build
```

### Loading the Extension in a Browser

Build the extension, then launch it from `dist/` in a browser for testing:

```sh
npm run serve:chrome
```

```sh
npm run serve:firefox
```

### Data Refresh Scripts

The `scripts` directory contains a Python script that refreshes `src/modules/vote-history/data/genres.ts` and `src/modules/vote-history/data/descriptors.ts`. Download the HTML data from [genre history](https://rateyourmusic.com/admin/queue/hq/profile_history?type=h&context=p&showall=1) and [descriptor history](https://rateyourmusic.com/admin/queue/hq/profile_history?type=d&context=p&showall=1), then run:

```sh
npm run refresh-all
```

This updates the TypeScript data files and writes text exports to the ignored `scripts/output/` directory.

### Other commands

```sh
npm run lint     # biome check (format + lint), tsc --noEmit, and ESLint (type-aware TS rules)
npm run format   # Auto-format with Biome
npm test         # Run unit tests with Vitest
```

## Project Structure

```
src/
  manifest.ts              # Extension manifest definition
  shared/                  # Code shared across all modules
    pages.ts               # Page URL patterns, labels, and global page key set (pure data, no I/O)
    page-settings.ts       # Storage helpers (getPageEnabled / setPageEnabled) and runPage orchestrator
    use-release-info.ts    # useReleaseInfo hook (shared by cover-art and release-submission)
    components/            # Shared Preact components (ServiceLinkForm, ServiceSelector, etc.)
    icons/                 # Generic icons
    services/              # Per-service clients
      applemusic/          # icon.tsx, icon-found.tsx, icon-notfound.tsx co-located here
      bandcamp/
      beatport/
      deezer/
      discogs/
      livemixtapes/
      melon/
      qobuz/
      soundcloud/
      spotify/
      tidal/
      youtube/
      index.ts             # SERVICES, SEARCHABLES, RESOLVABLES, EMBEDDABLES arrays
      types.ts             # Service, Searchable, Resolvable, Embeddable types
    utils/                 # DOM helpers, storage, cache, messaging, fetch wrappers, etc.
      messaging.ts         # Background messaging types, codecs, and sendBackgroundMessage (flat file)
  modules/                 # One directory per feature
    background/            # Service worker (message routing, tab icon management)
    popup/                 # Extension popup (feature toggle UI)
    cover-art/
    descriptor-links/
    film-genre/
    hide-ratings/
    hide-votes/
    map/
    release-submission/
    search-bar/
    stream-link-missing/
    stream-link-submission/
    stream-links/
    switch-genre-descriptor/
    timeline/
    track-time/
    user-collection/
    user-page/
    vote-history/
```

Each module follows the same pattern:

- `main.ts` - entry point; uses top-level `await runPage('key', async () => { await fn() })` to guard execution behind the feature toggle. `runPage` is imported from `~/shared/page-settings`.
- `app.ts` / `app.tsx` - the actual logic or root Preact component for the feature.

Service icons are co-located with their service (`services/spotify/icon.tsx`, `icon-found.tsx`, `icon-notfound.tsx`) rather than in a flat shared icons directory. Only generic UI icons (check, loader, x, info) live in `shared/icons/`.

## Credits

Forked from the original [better-rym](https://github.com/jgchk/better-rym) by [jgchk](https://github.com/jgchk). Thanks to all contributors over the years.

Refer to [@samrum/vite-plugin-web-extension](https://github.com/samrum/vite-plugin-web-extension) for build plugin documentation, and [Vite](https://vitejs.dev/config/) for general configuration reference.
