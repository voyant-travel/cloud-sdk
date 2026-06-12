---
"@voyantjs/cloud-sdk": minor
---

Add the Voyant Realtime surface: a `client.realtime` namespace (publish,
publishBatch, history, presence.get, tokens.mint) over REST, and a
standalone `RealtimeChannel` WebSocket subscriber client with
token-based auth, event callbacks (`connected`, `message`, `presence`,
`error`, `disconnected`), presence enter/update/leave, publishing, and
auto-reconnect with exponential backoff that resumes from the last
received message id via `sinceId` so no messages are lost across drops.

Also add the missing `vault.setSecret` and `vault.deleteSecret` methods
for the existing secret write/delete endpoints.
