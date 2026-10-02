# Ownership and release policy

The `rinspacehq` organization maintains this repository and the `@rinspacehq/milkdown-writing-preset` npm package. The source in this repository is authoritative for the public module. Rinspace consumes only an exact reviewed npm version with lockfile integrity; it does not import this repository's `main` branch or copy plugin source back into the private product.

Releases require maintainer review, clean `npm ci`, type/build/test checks, inspection of `npm pack` contents, third-party license review, and isolated validation in the Rinspace Markdown article and book editors. A public contribution is never applied to the private product automatically. A change to Markdown semantics or the public API needs tests, a migration note, and an appropriate version bump.

The npm release workflow is manual and requires a matching `vX.Y.Z` Git tag. It uses GitHub-hosted runners and npm trusted publishing when configured for this package. A maintainer must verify the workflow identity and package settings before triggering a release.
