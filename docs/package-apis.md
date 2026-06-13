# Package APIs

This document is a compact map of the current SDK surface.

## `@voyantjs/cloud-sdk`

Root client:

- `createVoyantCloudClient(options)`
- `new VoyantCloudClient(options)`

Root groups:

- `client.vault.listVaults()`
- `client.vault.listSecrets(vaultSlug)`
- `client.vault.getSecret(vaultSlug, key)`
- `client.sms.listPhoneNumbers()`
- `client.sms.listMessages()`
- `client.sms.sendMessage(input)`
- `client.verification.start(input)`
- `client.verification.check(input)`
- `client.verification.listAttempts()`
- `client.email.listMessages()`
- `client.email.sendMessage(input)`
- `client.email.getMessage(id)`
- `client.realtime.publish(channel, input)`
- `client.realtime.publishBatch(input)`
- `client.realtime.history(channel, query?)`
- `client.realtime.presence.get(channel)`
- `client.realtime.tokens.mint(input)`

Standalone exports:

- `new RealtimeChannel(options)` — WebSocket subscriber for a realtime
  channel (`on`, `publish`, `enterPresence`, `updatePresence`,
  `leavePresence`, `close`)
- `createSearchClientConfig(options)` — Typesense client config for the
  Voyant search proxy

Selected public types:

- `VaultSummary`
- `VaultSecretSummary`
- `VaultSecretValue`
- `PhoneNumberSummary`
- `PhoneNumberStatus`
- `PhoneNumberCapabilities`
- `SmsMessageSummary`
- `SmsMessageStatus`
- `SendSmsInput`
- `VerificationAttemptSummary`
- `VerificationCheckResult`
- `VerificationChannel`
- `VerificationAttemptStatus`
- `StartVerificationInput`
- `CheckVerificationInput`
- `EmailMessageSummary`
- `EmailMessageStatus`
- `SendEmailInput`
- `RealtimeMessageSummary`
- `RealtimePresenceMember`
- `RealtimeTokenSummary`
- `RealtimeCapability`
- `PublishRealtimeMessageInput`
- `PublishRealtimeBatchInput`
- `MintRealtimeTokenInput`
- `RealtimeChannelOptions`
- `RealtimeChannelEventMap`
