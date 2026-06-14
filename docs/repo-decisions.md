# Repo Decisions

`cloud-sdk` exists to publish the public `@voyant-travel/cloud-sdk` package.

## What belongs here

- the public `@voyant-travel/cloud-sdk` package
- shared SDK runtime code consumed by that package
- package-level tests
- lightweight Markdown documentation

## What does not belong here

- private Voyant Cloud implementation code
- product dashboards or internal tooling
- a standalone docs app

The main docs application will live in `voyant`. This repo only needs enough
Markdown to explain package boundaries, release expectations, and contract
generation.

## Package boundaries

- `@voyant-travel/cloud-sdk` is for Voyant Cloud services
- `@voyant-travel/sdk-core` is private and should contain only transport-level
  concerns

## Scope rule

- no product-specific business logic in `sdk-core`
- docs and examples should stay scoped to the Cloud surface
