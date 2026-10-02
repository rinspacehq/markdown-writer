# Ownership and release policy

The `rinspacehq` organization maintains this repository and the `@rinspacehq/milkdown-writing-preset` npm package. The source in this repository is authoritative for the public module. Rinspace consumes only an exact reviewed npm version with lockfile integrity; it does not import this repository's `main` branch or copy plugin source back into the private product.

Releases require maintainer review, clean `npm ci`, type/build/test checks, inspection of `npm pack` contents, third-party license review, and isolated validation in the Rinspace Markdown article and book editors. A public contribution is never applied to the private product automatically. A change to Markdown semantics or the public API needs tests, a migration note, and an appropriate version bump.

Releases use GitHub Releases, not the npm registry. Build and test from a reviewed commit, then attach the exact `npm pack` `.tgz` and a SHA-256 checksum file to a draft release for its `vX.Y.Z` tag. Publish only after both assets are attached. Release immutability must be enabled so the tag and assets cannot be replaced after publication. Consumers install the `.tgz` by its versioned release URL and verify its integrity in their lockfile; GitHub's generated source archives are not package artifacts.
