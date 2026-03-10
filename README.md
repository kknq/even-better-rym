# even-better-rymt

A browser extension that adds quality-of-life improvements to [RateYourMusic](https://rateyourmusic.com). Forked from the original [better-rym](https://github.com/jgchk/better-rym) to keep things maintained and moving forward. Contributions welcome.

Most of the credit goes to [jgchk](https://github.com/jgchk) and all the beautiful people who maintained and improved it over the years.

## Features

All features can be individually enabled or disabled from the extension popup.

---

### Attempt to Add Streaming Links on Release Pages

On every release page, a row of streaming service icons is injected below the release art. Each icon represents a supported streaming service.

- If the release already has a media link submitted on RYM for that service, the icon is shown at full opacity and links directly to it.
- If no link exists on RYM but one is found automatically via the service's search API, the icon is shown in a slightly different style (found, not yet submitted).
- If nothing is found, the icon is shown faded out.
- The original RYM media link container is hidden and replaced by this row.

---

### Release Submission Helper

Injects a "Step 0: Import" panel at the top of the release submission form. Paste a URL from any supported service and the form fields are filled in automatically. Includes the following sub-features:

- **Import** - Fetches release metadata (title, artist, tracklist, date, label, catalog number, credits) from a streaming service URL and auto-fills the submission form. Optionally downloads cover art at the same time.
- **File Under Performer Controls** - Adds a "+ [unknown artist]" button in the "Filed under performer" section for releases with no known performing artist.
- **Release Date Controls** - After an import, shows one-click buttons to fill in the release date and/or publish date retrieved from the imported data.
- **Label Controls** - Fixes a small existing bug with the Clear button and adds a "+ (No Label)" button that sets the label to the standard RYM "no label" entry and fills the catalog number with `n/a`.
- **Catalog Number Controls** - Adds "Clear" and "+ n/a" quick-fill buttons below the catalog number field.
- **Tracklist - Clear Lengths** - Adds a "clear lengths" button next to the existing "clear all" button, which strips track duration data from the advanced tracklist input while leaving track names intact.
- **Credits Section Enhancements** - Looks at the "Filed Under" artists and shows quick-add buttons to copy those artists directly into the credits field, saving repeated manual lookups.



---

### Cover Art Submission Helper

Injects a "Download Cover Art" panel on the cover art upload page. Paste a URL from any supported service, click Download, and the highest-resolution cover art is downloaded directly to your machine. The source URL field on the upload form is also pre-filled automatically.

---

### Media Links Submission Helpe

On the media link submission form, adds a service selector and a "Convert to Embed" button below the URL input. Detects the service from the pasted URL, fetches the correct embed code for that service, and replaces the URL in the input with the embed code - saving you from having to look it up manually.

---

### Music/Film Collection Filters

Injects a filter panel above the collection table with one-click filter buttons grouped by:

- **Status** - e.g. Owned, Wishlist, etc.
- **Rating** - all half-star increments from 0.5 to 5.0, plus Unrated / Rated.
- **Type** - Albums, EPs, Singles, Music Videos, Mixtapes, etc. (Not applicable to the film collection page)

Clicking a filter button navigates to the filtered collection URL immediately.

---

### User Page Enhancements

On your own user profile page adds inline **Edit** buttons to your "favorite artists" and "other comments" bio sections. Clicking Edit replaces the rendered text with a textarea pre-filled with your current content. You can then **Save**, **Preview** (renders RYM markup inline), or **Cancel** without leaving the page.

---

### Enhancements for Genre Vote History

On the genre vote history page, adds two enhancements:

- **Genre Dropdown** - A dropdown above the vote table that lets you filter the history to a specific genre without having to edit the URL manually.
- **Pagination Fix** - Corrects the page navigation links so that `show` and `start` URL parameters are preserved correctly when changing pages (RYM's default links lose your current `show` setting).

---

### Enhancements for Descriptor Vote History

Same two enhancements as the Genres vote history, applied to the descriptor vote history page:

- **Descriptor Dropdown** - Filter by a specific descriptor.
- **Pagination Fix** - Same pagination parameter fix as above.

---

### Filtering in "Media Link You Know" (/misc/media_link_you_know) List

Enhances the "media links you know" page (used for reporting releases that are missing stream links) with additional filters and an ability to search.

---

### Search Bar Shortcuts

Intercepts the main RYM search bar. If your search query matches the RYM markup shortcut format `[Type123]` - e.g. `[Artist67]`, `[Album42]`, `[Genre]` - pressing Enter or clicking the Search button will parse the markup and redirect you **directly to that entity's page** instead of showing search results. Supported types: `Artist`, `Album`, `Genre`, `Label`, `List`, `Rating`, `Venue`, `Concert`, `Bug`. If the query does not match the pattern, the default search behaviour is used unchanged.

---

## Development

### Prerequisites

```sh
npm install
```

### Environment Variables

Create a `.env` file in the project root. The following variables are required for Spotify and Tidal features to work:

```
VITE_SPOTIFY_ID=
VITE_SPOTIFY_SECRET=
VITE_TIDAL_ID=
VITE_TIDAL_SECRET=
```

### Manifest Version

The extension supports both Manifest V2 and V3. Set the `MANIFEST_VERSION` environment variable to switch between them (defaults to V3):

```
MANIFEST_VERSION=2
```

### Commands

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

### Loading the extension in a browser

Serve the contents of the `dist/` directory directly into a browser for testing:

```sh
npm run serve:chrome
```

```sh
npm run serve:firefox
```

### Other commands

```sh
npm run lint     # Type-check, ESLint, and Prettier check
npm run format   # Auto-format with Prettier
npm test         # Run unit tests with Vitest
```

## Project Structure

```
src/
  manifest.ts          # Extension manifest definition
  common/              # Shared utilities, hooks, components, and service integrations
    services/          # Per-service clients
    utils/             # DOM helpers, storage, messaging, fetch wrappers, etc.
    components/        # Shared Preact components
  modules/             # One directory per feature
    background/        # Service worker (message routing, tab icon management)
    popup/             # Extension popup (feature toggle UI)
    cover-art/
    release-submission/
    search-bar/
    stream-link-missing/
    stream-link-submission/
    stream-links/
    user-collection/
    user-page/
    vote-history/
```

Each module follows the same pattern: a `main.ts` entry point that calls `runPage()` to check whether the feature is enabled before running, and an `index.ts` / `index.tsx` that contains the actual logic.

## Credits

Forked from the original [better-rym](https://github.com/jgchk/better-rym) by [jgchk](https://github.com/jgchk). Thanks to all contributors over the years.

Refer to [@samrum/vite-plugin-web-extension](https://github.com/samrum/vite-plugin-web-extension) for build plugin documentation, and [Vite](https://vitejs.dev/config/) for general configuration reference.
