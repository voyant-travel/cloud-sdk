# Overview

`cloud-sdk` publishes one public TypeScript package:

- `@voyant-travel/cloud-sdk`

Shared transport and error handling stay in a private internal package so the
public SDK boundary stays clean.

## Package boundaries

- `@voyant-travel/cloud-sdk` wraps Voyant Cloud APIs (vault, sms, verification, email,
  browser, video) and exposes a `createSearchClientConfig` helper for the
  Voyant search proxy.
- `@voyant-travel/sdk-core` contains shared request plumbing only.

## Search

Voyant's search service is a Typesense-compatible proxy. The SDK does not ship
a hand-rolled search surface — instead, `createSearchClientConfig` returns a
config object you pass directly to the official `typesense` client. Auth is
your Voyant API token (`Authorization: Bearer ...`); the proxy handles
isolation, scoped Typesense keys, and collection name rewriting transparently.
See the package README for usage.
