# `@voyantjs/cloud-sdk`

Public TypeScript client for Voyant Cloud APIs.

## Scope

`@voyantjs/cloud-sdk` is for hosted Voyant Cloud services:

- vault (read secrets; per-call and envelope crypto)
- sms (send messages, list phone numbers and messages)
- verification (start verification, check codes, list recent attempts)
- email (list, send, and fetch email messages)
- browser (render content, screenshots, PDFs; scrape and extract; manage
  long-running crawls and keep-alive Puppeteer sessions)
- video (manage uploads, playback, captions, watermarks, signed playback
  tokens; create videos from a public URL)
- search (`createSearchClientConfig` returns a Typesense client config pointed
  at the Voyant search proxy)

## Install

```sh
pnpm add @voyantjs/cloud-sdk
```

## Usage

```ts
import { createVoyantCloudClient } from "@voyantjs/cloud-sdk";

const client = createVoyantCloudClient({
  apiKey: process.env.VOYANT_API_KEY!,
});

const vaults = await client.vault.listVaults();
const phoneNumbers = await client.sms.listPhoneNumbers();
```

### From env / worker bindings

`getVoyantCloudClient` reads `VOYANT_CLOUD_API_KEY` (and optionally
`VOYANT_CLOUD_API_URL`, `VOYANT_CLOUD_USER_AGENT`) from a bindings/env
object and constructs a client. It throws a typed `VoyantCloudConfigError`
when the key is missing.

```ts
import { getVoyantCloudClient, type VoyantCloudEnv } from "@voyantjs/cloud-sdk";

// Cloudflare Worker
export default {
  async fetch(_req: Request, env: VoyantCloudEnv) {
    const cloud = getVoyantCloudClient(env);
    return Response.json(await cloud.vault.listVaults());
  },
};
```

```ts
import { getVoyantCloudClient } from "@voyantjs/cloud-sdk";

// Node
const cloud = getVoyantCloudClient(process.env);
const vaults = await cloud.vault.listVaults();
```

`overrides` win over env values, except an empty-string override is
treated as missing so it can't silently clobber a valid env value:

```ts
import { getVoyantCloudClient, type VoyantCloudEnv } from "@voyantjs/cloud-sdk";

declare const env: VoyantCloudEnv;
declare const tenantKey: string;

const cloud = getVoyantCloudClient(env, { apiKey: tenantKey });
```

For paths that legitimately operate without cloud (local dev tooling that
doesn't send mail, etc.), use `tryGetVoyantCloudClient` — it returns
`null` instead of throwing when the key is unset.

## Shape

Root groups:

- `vault`
- `sms`
- `verification`
- `email`
- `browser`
- `video`
- `search` (standalone `createSearchClientConfig` export, not on the client)

The `vault` group covers list-vaults, list-secrets, and get-secret routes,
plus per-call (`encrypt`/`decrypt`) and envelope (`generateDataKey`/`unwrap`)
crypto. The per-call pair is right for ad-hoc single-field encryption; the
envelope pair fits bulk workloads where caching a DEK per row or batch
avoids one HTTP round-trip per value. `ciphertext` is one opaque base64
string (`nonce[12] || ciphertext`); `dek`/`wrappedDek` are also base64.

```ts
import { createVoyantCloudClient } from "@voyantjs/cloud-sdk";

const client = createVoyantCloudClient({
  apiKey: process.env.VOYANT_API_KEY!,
});

// Per-call: one HTTP round-trip per value.
const { ciphertext } = await client.vault.encrypt("primary", "hello");
const { plaintext } = await client.vault.decrypt("primary", ciphertext);

// Envelope: fetch a DEK once, encrypt many values locally, persist
// `wrappedDek` alongside the ciphertexts, and unwrap on read.
const { dek, wrappedDek } = await client.vault.generateDataKey("primary");
// ... AES-GCM with `dek`, store `wrappedDek` per row ...
const recovered = await client.vault.unwrap("primary", wrappedDek);
```

The `sms` group covers list-phone-numbers, list-messages, and send-message
routes.

The `verification` group covers verification start, check, and list-attempts routes.

The `email` group covers list-messages, send-message, and get-message routes.

The `browser` group exposes Cloudflare Browser Rendering through Voyant. Render
helpers (`content`, `markdown`, `snapshot`, `scrape`, `links`, `json`) return
the unwrapped Cloudflare `result`. Binary helpers (`screenshot`, `pdf`) return
a `Uint8Array`. The `browser.crawls` and `browser.sessions` namespaces manage
long-running crawl jobs and keep-alive Puppeteer sessions.

```ts
import { createVoyantCloudClient } from "@voyantjs/cloud-sdk";

const client = createVoyantCloudClient({
  apiKey: process.env.VOYANT_API_KEY!,
});

const html = await client.browser.content({ url: "https://example.com" });
const png = await client.browser.screenshot({
  url: "https://example.com",
  screenshotOptions: { fullPage: true },
});

const session = await client.browser.sessions.open({ keepAliveMs: 60_000 });
await client.browser.sessions.runCommands(session.id, {
  commands: [
    { op: "goto", url: "https://example.com" },
    { op: "screenshot" },
  ],
});
await client.browser.sessions.close(session.id);
```

The `search` surface is a config helper, not a wrapped client. Voyant's
search proxy speaks the Typesense HTTP protocol, so `createSearchClientConfig`
hands back a config you pass straight to the official `typesense` package:

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

await search.collections().create({
  name: "products",
  fields: [
    { name: "name", type: "string" },
    { name: "tags", type: "string[]", facet: true },
  ],
});

await search
  .collections("products")
  .documents()
  .import([{ id: "1", name: "Sneakers", tags: ["shoes"] }], {
    action: "upsert",
  });

const hits = await search
  .collections("products")
  .documents()
  .search({ q: "sneak", query_by: "name,tags" });
```

`apiKey` is your Voyant API token (`search:read` for queries,
`search:write` for writes). The proxy auths with `Authorization: Bearer ...`,
substitutes the project's scoped Typesense key downstream, and rewrites
collection names so isolation prefixes never leak into your code. `typesense`
is a peer requirement — install it alongside the SDK if you use search.

The `video` group covers the Voyant video service: `videos.{list, get,
createUpload, createFromUrl, update, delete, enableDownload, mintToken}`,
captions under `videos.captions.{list, upload, generate, delete}`, and
`watermarks.{list, create, delete}`.

```ts
import { createVoyantCloudClient } from "@voyantjs/cloud-sdk";

declare const file: File;

const client = createVoyantCloudClient({
  apiKey: process.env.VOYANT_API_KEY!,
});

const ticket = await client.video.videos.createUpload({
  name: "intro",
  fileSize: file.size,
  maxDurationSeconds: 600,
  tags: ["marketing", "launch"],
});
// ticket.uploadUrl is a one-time TUS endpoint — upload the file with a TUS
// client (e.g. tus-js-client) using `uploadUrl: ticket.uploadUrl`.

const playback = await client.video.videos.mintToken(ticket.video.id, {
  expiresInSeconds: 3600,
});
// For signed videos, hand `playback.playbackHlsUrl` to your HLS player.
// Public videos can use `ticket.video.playbackHlsUrl` directly.
```

## Key public types

Useful exported types include:

- `VaultSummary`, `VaultSecretSummary`, `VaultSecretValue`,
  `VaultEncryptResult`, `VaultDecryptResult`, `VaultGenerateDataKeyResult`,
  `VaultUnwrapResult`
- `PhoneNumberSummary`, `SmsMessageSummary`, `SendSmsInput`
- `VerificationAttemptSummary`, `VerificationCheckResult`
- `StartVerificationInput`, `CheckVerificationInput`
- `EmailMessageSummary`, `SendEmailInput`
- `BrowserRenderInput`, `BrowserScreenshotInput`, `BrowserPdfInput`,
  `BrowserScrapeInput`, `BrowserJsonInput`
- `BrowserSessionSummary`, `OpenBrowserSessionInput`, `BrowserCommand`,
  `RunBrowserCommandsInput`, `RunBrowserCommandsResult`
- `BrowserCrawlSummary`, `StartBrowserCrawlInput`, `StartBrowserCrawlResult`
- `VideoSummary`, `VideoUploadTicket`, `VideoCaptionSummary`,
  `VideoWatermarkProfileSummary`, `VideoSignedToken`
- `CreateVideoUploadInput`, `CreateVideoFromUrlInput`, `UpdateVideoInput`,
  `MintVideoSignedTokenInput`, `UploadVideoCaptionInput`,
  `GenerateVideoCaptionInput`, `CreateVideoWatermarkInput`,
  `VideoStatus`, `VideoCaptionStatus`, `VideoDownloadStatus`,
  `VideoWatermarkPosition`
- `SearchClientConfig`, `SearchClientConfigOptions`
- `PhoneNumberStatus`, `SmsMessageStatus`, `VerificationChannel`,
  `VerificationAttemptStatus`, `EmailMessageStatus`,
  `BrowserSessionStatus`, `BrowserJobStatus`

## Notes

- default base URL is `https://api.voyantjs.com`
- request auth defaults to `authorization: Bearer <apiKey>`
- response envelopes of the form `{ data: ... }` are unwrapped by default
- API tokens are scoped (`vault:read`, `vault:write`, `sms:read`, `sms:send`,
  `phone-numbers:read`, `verification:start`, `verification:check`,
  `verification:read`, `emails:read`, `emails:send`, `browser:render`,
  `browser:scrape`, `browser:extract`, `browser:crawl`, `browser:sessions`,
  `video:read`, `video:upload`, `video:delete`, `video:captions:write`,
  `video:watermarks:write`, `search:read`, `search:write`);
  requests fail with `403` if the token does not include the required scope

For repo-level context, see [../../docs/cloud.md](../../docs/cloud.md).
