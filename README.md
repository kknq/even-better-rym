# even-better-rym

I was tired of getting no updates so I forked the original repo and will try to publish it. Feel free to contribute.

All credit goes to [jgchk](https://github.com/jgchk) and all the beautiful people who maintained and made changes during the years

## Usage Notes

The extension manifest is defined in `src/manifest.ts` and used by `@samrum/vite-plugin-web-extension` in the vite config.

All adittional functionality and scripts are located in the `src/modules` directory.

Otherwise, the project functions just like a regular Vite project.

To switch between Manifest V2 and Manifest V3 builds, use the MANIFEST_VERSION environment variable defined in `.env` or just change the option in the vite.config.ts

HMR during development in Manifest V3 requires Chromium version >= 110.0.5480.0.

Refer to [@samrum/vite-plugin-web-extension](https://github.com/samrum/vite-plugin-web-extension) for more usage notes.

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

## Commands

### Build

#### Development, HMR

Hot Module Reloading is used to load changes inline without requiring extension rebuilds and extension/page reloads
Currently only works in Chromium based browsers. Can have issues with working correctly because of CORS.

```sh
npm run dev
```

#### Development, Watch

Rebuilds extension on file changes. Requires a reload of the extension (and page reload if using content scripts). 
Safe and stable option to test changes, though it is quite a bit slower.

```sh
npm run watch
```

#### Production

Minifies and optimizes extension build

```sh
npm run build
```

### Load extension in browser

Loads the contents of the dist directory into the specified browser

```sh
npm run serve:chrome
```

```sh
npm run serve:firefox
```
