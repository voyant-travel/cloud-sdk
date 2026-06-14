# SDK Design

This repo should optimize for clear public SDKs, not for mirroring internal app
structure.

## Design goals

- product-scoped packages
- predictable auth and transport behavior
- explicit method names
- stable entrypoints
- easy future split into separate repos if needed

## Client shape

Current design:

- `@voyant-travel/cloud-sdk` has a root client plus operation-scoped groups
- shared request machinery lives in `sdk-core`

## Why not one client type for everything

One giant client would make package boundaries and auth stories less clear.

## Naming rule

Prefer names that describe the public action:

- `listCollections`
- `queryCollection`
- `sendEmail`

Avoid leaking internal route or job terminology unless it is already part of
the public API language.

## Shared runtime rule

If code in `sdk-core` needs to know what a provider registration or vault
response means semantically, it probably does not belong in `sdk-core`.
