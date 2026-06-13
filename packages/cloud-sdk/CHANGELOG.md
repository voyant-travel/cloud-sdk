# @voyantjs/cloud-sdk

## 0.9.0

### Minor Changes

- 8fa7f4d: Add the Voyant Realtime surface: a `client.realtime` namespace (publish,
  publishBatch, history, presence.get, tokens.mint) over REST, and a
  standalone `RealtimeChannel` WebSocket subscriber client with
  token-based auth, event callbacks (`connected`, `message`, `presence`,
  `error`, `disconnected`), presence enter/update/leave, publishing, and
  auto-reconnect with exponential backoff that resumes from the last
  received message id via `sinceId` so no messages are lost across drops.

  Also add the missing `vault.setSecret` and `vault.deleteSecret` methods
  for the existing secret write/delete endpoints.

## 0.8.1

### Patch Changes

- 5543b28: Return ready-to-use signed HLS and DASH playback URLs from `videos.mintToken`.

## 0.8.0

### Minor Changes

- f53f324: Add per-call and envelope crypto methods to `client.vault`: `encrypt`,
  `decrypt`, `generateDataKey`, and `unwrap`. Use the per-call pair for
  ad-hoc single-field encryption; use the envelope pair when caching a DEK
  per row/batch is the right tradeoff. Wire format for `ciphertext` is one
  opaque base64 string (`nonce[12] || ciphertext`); `dek`/`wrappedDek` are
  also base64. New exported types: `VaultEncryptResult`, `VaultDecryptResult`,
  `VaultGenerateDataKeyResult`, `VaultUnwrapResult`.

## 0.7.0

### Minor Changes

- b08914e: Add `tags` support to the video API. `VideoSummary` now includes a `tags:
string[]` field, and `CreateVideoUploadInput`, `CreateVideoFromUrlInput`, and
  `UpdateVideoInput` accept an optional `tags` array (max 50 tags, each up to 64
  characters). On update, the supplied array replaces the existing tag set.
- 45fef9e: `videos.createUpload` now requires `fileSize` (bytes). The upload-ticket
  endpoint switched to Cloudflare Stream's TUS protocol, so the server needs the
  file length up front for the `Upload-Length` header. `ticket.uploadUrl` is now a
  one-time TUS endpoint (use `tus-js-client` or another TUS client) rather than a
  multipart POST URL.

### Patch Changes

- 309a140: Fix README and docs snippets so `verify:readmes` typechecks. The TUS-migration
  example referenced `file.size` without declaring `file`, which caused CI to
  fail on push to main. Snippets now declare `file` and surface the new `tags`
  field.

## 0.6.2

### Patch Changes

- e70cdcf: Widen the optional `typesense` peer dependency from `^2.0.0` to `>=2.0.0 <4.0.0` so consumers can install either v2 or v3 (latest stable is `3.x`). The previous range forced downstream projects onto v2 even though the `createSearchClientConfig` output shape is unchanged between v2 and v3. The dev dependency is bumped to `^3.0.6` so we develop against the current stable release.

## 0.6.1

### Patch Changes

- 61b277a: Fix `TypeError: Illegal invocation` when calling the SDK from Cloudflare
  Workers (workerd). The bundled `VoyantTransport` previously stored the
  global `fetch` as a class property and invoked it via `this.fetchImpl(...)`,
  which workerd rejects because `fetch` must be called with `globalThis` as
  the receiver. The transport now binds `fetch` to `globalThis` at
  construction time, so the documented happy-path snippets work on Workers
  without consumers having to pass a wrapped `fetch`.

## 0.6.0

### Minor Changes

- 7820cb5: Add an env-bindings adapter so consumers stop hand-rolling the same env-read +
  empty-string + typed-error logic to construct a `VoyantCloudClient`. Reads
  `VOYANT_CLOUD_API_KEY`, `VOYANT_CLOUD_API_URL`, and `VOYANT_CLOUD_USER_AGENT`
  from a Cloudflare Worker `env`, Node `process.env`, or any other key/value
  bag of strings.

  ```ts
  import { getVoyantCloudClient } from "@voyantjs/cloud-sdk";

  // Cloudflare Worker
  export default {
    async fetch(_req: Request, env: VoyantCloudEnv) {
      const cloud = getVoyantCloudClient(env);
      return Response.json(await cloud.vault.listVaults());
    },
  };

  // Node
  const cloud = getVoyantCloudClient(process.env);
  ```

  - `getVoyantCloudClient(env, overrides?)` throws `VoyantCloudConfigError`
    when no API key can be resolved.
  - `tryGetVoyantCloudClient(env, overrides?)` returns `null` instead, for
    paths that legitimately operate without cloud (e.g. local dev tooling
    that doesn't send mail).
  - `overrides` take precedence over env values, except an empty-string
    override is treated as missing — it can't silently clobber a valid env
    value.
  - Empty-string env values are treated the same as `undefined`, common
    when `.env` files leave a key blank.

  Adds `VoyantCloudEnv` and `VoyantCloudConfigError` to the public type
  surface.

## 0.5.0

### Minor Changes

- 6dc93c5: Add `createSearchClientConfig` for the Voyant search proxy. The helper
  returns a configuration object that you pass directly to the official
  `typesense` client — no hand-rolled search surface to learn, no
  prefix-stamping or auth-header wiring on your side.

  ```ts
  import { Client } from "typesense";
  import { createSearchClientConfig } from "@voyantjs/cloud-sdk";

  const search = new Client(
    createSearchClientConfig({
      apiKey: process.env.VOYANT_API_KEY!,
      organizationSlug: "acme",
      projectName: "catalog",
    }),
  );
  ```

  `apiKey` is your Voyant API token (`search:read` for queries,
  `search:write` for writes). The proxy auths with `Authorization: Bearer
...`, substitutes the project's scoped Typesense key downstream, and
  rewrites collection names so isolation prefixes never leak into your
  code.

  `typesense` is declared as an optional peer dependency — install it
  alongside `@voyantjs/cloud-sdk` if you use search.

  Adds the `SearchClientConfig` and `SearchClientConfigOptions` types to
  the public type surface.

## 0.4.0

### Minor Changes

- a86c5de: Add `video` group to `@voyantjs/cloud-sdk`. The new surface covers video
  uploads (`videos.createUpload`, `videos.createFromUrl`), playback and
  lifecycle (`videos.list`, `videos.get`, `videos.update`, `videos.delete`,
  `videos.enableDownload`, `videos.mintToken`), captions
  (`videos.captions.{list, upload, generate, delete}`), and watermark
  profiles (`watermarks.{list, create, delete}`).

## 0.3.0

### Minor Changes

- 1e5b76e: Add `browser` group to `@voyantjs/cloud-sdk`, exposing Cloudflare Browser
  Rendering through Voyant: `content`, `markdown`, `snapshot`, `scrape`,
  `links`, `json`, `screenshot` and `pdf` render helpers; `browser.crawls.*`
  for long-running crawl jobs; and `browser.sessions.*` for keep-alive
  Puppeteer sessions with a typed command schema.

  `@voyant-sdk/sdk-core` adds a `responseType` option to `VoyantRequestOptions`
  (`"json" | "text" | "binary"`) so the transport can return raw text or a
  `Uint8Array` for binary endpoints (used by `screenshot`/`pdf`).

### Patch Changes

- Updated dependencies [1e5b76e]
  - @voyant-sdk/sdk-core@0.2.0

## 0.2.0

### Minor Changes

- d61f7c9: Email surface updates:
  - add `attachments` to `SendEmailInput` and export new `SendEmailAttachment` type for sending file attachments (base64 `content` or remote `path`, with optional `contentType` and `contentId` for inline images)
  - rename `EmailMessageSummary.resendEmailId` to `providerEmailId` to reflect that the field carries the upstream provider's message id rather than a Resend-specific value
