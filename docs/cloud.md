# Cloud SDK

`@voyantjs/cloud-sdk` is the public TypeScript client for Voyant Cloud APIs.

## Current shape

- `vault` group for listing vaults, reading secrets, and per-call /
  envelope crypto (`encrypt`, `decrypt`, `generateDataKey`, `unwrap`)
- `sms` group for listing phone numbers, listing messages, and sending messages
- `verification` group for starting verification attempts, checking codes, and listing recent attempts
- `email` group for listing, sending, and fetching email messages
- `browser` group for rendering web pages, taking screenshots and PDFs,
  scraping and extracting data, running long crawl jobs, and driving
  keep-alive Puppeteer sessions
- `video` group for managing video uploads, playback, captions, watermarks,
  and minting signed playback tokens with playable HLS/DASH URLs
- `realtime` group for publishing messages (single and batch), reading
  channel history and presence, and minting short-lived client tokens
- `RealtimeChannel` standalone WebSocket subscriber client (token-based
  auth, auto-reconnect with `sinceId` resume)

## Key public types

- vault: `VaultSummary`, `VaultSecretSummary`, `VaultSecretValue`,
  `VaultEncryptResult`, `VaultDecryptResult`, `VaultGenerateDataKeyResult`,
  `VaultUnwrapResult`
- sms: `PhoneNumberSummary`, `SmsMessageSummary`, `SendSmsInput`,
  `PhoneNumberStatus`, `SmsMessageStatus`
- verification: `VerificationAttemptSummary`, `VerificationCheckResult`,
  `StartVerificationInput`, `CheckVerificationInput`, `VerificationChannel`,
  `VerificationAttemptStatus`
- email: `EmailMessageSummary`, `SendEmailInput`, `EmailMessageStatus`
- browser: `BrowserRenderInput`, `BrowserScreenshotInput`, `BrowserPdfInput`,
  `BrowserScrapeInput`, `BrowserJsonInput`, `BrowserSessionSummary`,
  `OpenBrowserSessionInput`, `BrowserCommand`, `RunBrowserCommandsInput`,
  `RunBrowserCommandsResult`, `BrowserCrawlSummary`, `StartBrowserCrawlInput`,
  `StartBrowserCrawlResult`, `BrowserSessionStatus`, `BrowserJobStatus`
- video: `VideoSummary`, `VideoUploadTicket`, `VideoCaptionSummary`,
  `VideoWatermarkProfileSummary`, `VideoSignedToken`,
  `CreateVideoUploadInput`, `CreateVideoFromUrlInput`, `UpdateVideoInput`,
  `MintVideoSignedTokenInput`, `UploadVideoCaptionInput`,
  `GenerateVideoCaptionInput`, `CreateVideoWatermarkInput`,
  `VideoStatus`, `VideoCaptionStatus`, `VideoDownloadStatus`,
  `VideoWatermarkPosition`
- realtime: `RealtimeMessageSummary`, `RealtimePresenceMember`,
  `RealtimeTokenSummary`, `PublishRealtimeMessageInput`,
  `PublishRealtimeBatchInput`, `MintRealtimeTokenInput`,
  `RealtimeCapability`, `RealtimeChannelOptions`, `RealtimeChannelEventMap`,
  `RealtimeChannelPresenceEvent`, `RealtimeChannelError`,
  `RealtimeChannelConnectedEvent`, `RealtimeChannelDisconnectedEvent`,
  `RealtimePresenceAction`

## Auth scopes

API tokens are scoped. The required scopes per group:

- `vault.{listVaults, listSecrets, getSecret, decrypt, unwrap}` require
  `vault:read`
- `vault.{encrypt, generateDataKey}` require `vault:write`
- `sms.listPhoneNumbers` requires `phone-numbers:read`
- `sms.listMessages` requires `sms:read`
- `sms.sendMessage` requires `sms:send`
- `verification.start` requires `verification:start`
- `verification.check` requires `verification:check`
- `verification.listAttempts` requires `verification:read`
- `email.listMessages` and `email.getMessage` require `emails:read`
- `email.sendMessage` requires `emails:send`
- `browser.content`, `browser.markdown`, `browser.screenshot`, `browser.pdf`,
  and `browser.snapshot` require `browser:render`
- `browser.scrape` and `browser.links` require `browser:scrape`
- `browser.json` requires `browser:extract`
- `browser.crawls.*` requires `browser:crawl`
- `browser.sessions.*` requires `browser:sessions`
- `video.videos.{list, get, mintToken}`, `video.videos.captions.list`,
  and `video.watermarks.list` require `video:read`
- `video.videos.{createUpload, createFromUrl, update, enableDownload}`
  requires `video:upload`
- `video.videos.delete` requires `video:delete`
- `video.videos.captions.{upload, generate, delete}` requires
  `video:captions:write`
- `video.watermarks.{create, delete}` requires `video:watermarks:write`

## Example

```ts
import { createVoyantCloudClient, RealtimeChannel } from "@voyantjs/cloud-sdk";

declare const file: File;

const client = createVoyantCloudClient({
  apiKey: process.env.VOYANT_API_KEY!,
});

const vaults = await client.vault.listVaults();
const message = await client.sms.sendMessage({
  to: "+14155551234",
  body: "Hello from Voyant Cloud",
});

const html = await client.browser.content({ url: "https://example.com" });
const pdf = await client.browser.pdf({
  url: "https://example.com",
  pdfOptions: { format: "a4", printBackground: true },
});

const ticket = await client.video.videos.createUpload({
  name: "intro",
  fileSize: file.size,
  maxDurationSeconds: 600,
  tags: ["marketing", "launch"],
});
// ticket.uploadUrl is a one-time TUS endpoint — upload the file with a TUS
// client (e.g. tus-js-client) using `uploadUrl: ticket.uploadUrl`.

await client.realtime.publish("orders:eu", {
  event: "order.updated",
  data: { orderId: "ord_1" },
});
// Mint a short-lived client token and subscribe over WebSocket.
const { token } = await client.realtime.tokens.mint({
  clientId: "user_42",
  capabilities: { "orders:*": ["subscribe", "presence"] },
});
const channel = new RealtimeChannel({ channel: "orders:eu", token });
channel.on("message", (message) => console.log(message.event, message.data));
```
