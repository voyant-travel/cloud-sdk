# Contributing

This repo publishes public TypeScript SDK packages for hosted Voyant products.

## Scope

Changes here should improve:

- public package ergonomics
- request and response typing
- transport reliability
- release quality
- SDK-facing documentation

Changes here should not pull in private `voyant-cloud` implementation details.

## Working rules

- keep `@voyant-travel/sdk-core` small and transport-focused
- do not add product-specific business logic to shared packages
- prefer stable public naming over mirroring internal service naming exactly
- write Markdown docs in this repo, not a docs app

## Before publishing

- typecheck the workspace
- lint changed packages
- verify package exports and examples still match the public API shape
- make sure docs mention any user-visible change in auth, request shape, or
  package boundaries

## Contract updates

When the API contract changes in `voyant-cloud`, update the relevant SDK package
without importing private application code directly.
