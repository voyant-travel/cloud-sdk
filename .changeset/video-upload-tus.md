---
"@voyantjs/cloud-sdk": minor
---

`videos.createUpload` now requires `fileSize` (bytes). The upload-ticket
endpoint switched to Cloudflare Stream's TUS protocol, so the server needs the
file length up front for the `Upload-Length` header. `ticket.uploadUrl` is now a
one-time TUS endpoint (use `tus-js-client` or another TUS client) rather than a
multipart POST URL.
