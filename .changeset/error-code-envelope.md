---
"@voyant-travel/cloud-sdk": minor
---

Surface the standardized API error envelope on `VoyantApiError`.

The Cloud and Connect APIs now return `{ error, code?, requestId? }` for every error (previously some errors were plain text). The SDK transport:

- derives `error.message` from the `error` key as well as `message`, so the server's human-readable text is preserved under the new envelope (it previously fell back to a generic `"Request failed with status …"`);
- exposes a new `error.code` (the stable machine-readable code, e.g. `unauthorized`, `forbidden`, `not_found`, `rate_limited`) so callers can branch on it instead of matching status codes or messages;
- adds a `CloudErrorCode` union type for those codes.

`VoyantApiError` and `CloudErrorCode` are now re-exported from `@voyant-travel/cloud-sdk` (the error class was previously only reachable from the internal core package). Additive and backward compatible — `error.code` is `null` for responses without a `code`.
