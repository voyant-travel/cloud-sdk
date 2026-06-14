# @voyant-travel/sdk-core

## 0.2.0

### Minor Changes

- 1e5b76e: Add `browser` group to `@voyant-travel/cloud-sdk`, exposing Cloudflare Browser
  Rendering through Voyant: `content`, `markdown`, `snapshot`, `scrape`,
  `links`, `json`, `screenshot` and `pdf` render helpers; `browser.crawls.*`
  for long-running crawl jobs; and `browser.sessions.*` for keep-alive
  Puppeteer sessions with a typed command schema.

  `@voyant-travel/sdk-core` adds a `responseType` option to `VoyantRequestOptions`
  (`"json" | "text" | "binary"`) so the transport can return raw text or a
  `Uint8Array` for binary endpoints (used by `screenshot`/`pdf`).
