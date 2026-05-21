---
"@voyantjs/cloud-sdk": minor
---

Add per-call and envelope crypto methods to `client.vault`: `encrypt`,
`decrypt`, `generateDataKey`, and `unwrap`. Use the per-call pair for
ad-hoc single-field encryption; use the envelope pair when caching a DEK
per row/batch is the right tradeoff. Wire format for `ciphertext` is one
opaque base64 string (`nonce[12] || ciphertext`); `dek`/`wrappedDek` are
also base64. New exported types: `VaultEncryptResult`, `VaultDecryptResult`,
`VaultGenerateDataKeyResult`, `VaultUnwrapResult`.
