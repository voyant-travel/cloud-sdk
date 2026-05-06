---
"@voyantjs/cloud-sdk": minor
---

Add `tags` support to the video API. `VideoSummary` now includes a `tags:
string[]` field, and `CreateVideoUploadInput`, `CreateVideoFromUrlInput`, and
`UpdateVideoInput` accept an optional `tags` array (max 50 tags, each up to 64
characters). On update, the supplied array replaces the existing tag set.
