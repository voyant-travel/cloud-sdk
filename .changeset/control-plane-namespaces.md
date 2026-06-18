---
"@voyant-travel/cloud-sdk": minor
---

Add control-plane namespaces: `client.apps` (with `.environments`, `.envVars`,
`.deployments`, and `.runtimeLogs`), `client.databases` (Neon branches, roles,
connection strings, usage), and `client.storage.buckets`. These wrap the
API-token routes under `/cloud/v1`, with the organization resolved from the
token. Decryption is intentionally not exposed here — only the existing
`client.vault` methods reach secret values, and CLI-minted tokens lack the
`vault:read` scope they require.
