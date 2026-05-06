---
"@voyantjs/cloud-sdk": patch
---

Fix README and docs snippets so `verify:readmes` typechecks. The TUS-migration
example referenced `file.size` without declaring `file`, which caused CI to
fail on push to main. Snippets now declare `file` and surface the new `tags`
field.
