# Rinspace Markdown Writer

[简体中文](README.zh-CN.md)

This writing page is built with [Milkdown](https://github.com/Milkdown/milkdown) and its Crepe editor. Milkdown supplies the editor framework and built-in editing features. Rinspace maintains the page shell, the integration code, and eight writing enhancements for headings, math, tables, and cursor behavior. We credit Milkdown and the other upstream projects in [License and attribution](#license-and-attribution).

The public title field and Milkdown editor are the source used by Rinspace's `/write/markdown` page. The website adds account-bound controls through private adapters: tags, cover upload, image storage, Quiver, drafts, saving, and publishing. The generated page runs the public source directly, so a contributor can see a change in the same retained writing surface that Rinspace consumes.

## Run the page

The next release is `v0.2.0`. After its GitHub Release is published, one command creates a local React project, installs its exact package version, and starts Vite:

```sh
npm exec --yes --package=https://github.com/rinspacehq/markdown-writer/releases/download/v0.2.0/rinspacehq-markdown-writer-0.2.0.tgz -- markdown-writer create my-markdown-writer
```

Node.js 20 or newer is required. The command refuses to overwrite an existing directory and prints the local URL. Stop it with Ctrl+C. To make static files, run `npm run build` in the generated directory and host `dist/` yourself. This command does not deploy a website.

To try a reviewed candidate before release:

```sh
npm ci
npm run build
npm pack
node bin/create-demo.mjs create my-markdown-writer --package-spec file:/absolute/path/to/rinspacehq-markdown-writer-0.2.0.tgz
```

The page contains the article title, the Milkdown writing surface, its toolbar, fullscreen control, and the same LaTeX editing panel. It opens with an empty document. It does not ask for a Rinspace account or contact Rinspace services. The page has no tag picker, cover upload, image upload, Quiver, save, publish, local file import, or Markdown source panel.

## Shared source and public API

The package exports the production writing pieces from `@rinspacehq/markdown-writer/writer`:

- `WriterTitleField` and `WriterEditorFrame` render the retained page controls.
- `createWriterEditor` creates Crepe with the same feature and plugin configuration. A host can add private controls through `extendTopBar` and supply an image upload adapter; the public page leaves both unset.
- `syncWriterTitle` and the Markdown title helpers keep the document title aligned with its first H1.
- `applyWriterTopBarLabels` gives the toolbar accessible names.
- `@rinspacehq/markdown-writer/writer.css` contains the writing surface styles extracted from the Rinspace page.

`@rinspacehq/markdown-writer/latex-editor` exports the LaTeX block panel and its selection lifecycle. `@rinspacehq/markdown-writer/code-editor` exports the shared CodeMirror control. The package root exports the eight writing plugins and Markdown helpers; `/interactions` exports the cursor, paste, math, and reparse lifecycle. Use these documented entries rather than internal files.

Milkdown Crepe's LaTeX, CodeMirror, Table, Toolbar, BlockEdit, TopBar, and LinkTooltip features remain Milkdown features. The eight Rinspace plugins add the tested input and cursor behaviors. The public page and Rinspace register them through the same `createWriterEditor` function.

## Contributing and releases

Run `npm ci`, `npm run build`, `npm test`, and `npm pack --dry-run`. Test the packed tarball in a clean generated page. Changes to the page must also pass Rinspace's Markdown article and book editor integration checks against that exact tarball. A public change enters the product only after maintainer review, an immutable GitHub Release, and a private dependency update pinned to the release asset and lockfile integrity. Rinspace does not consume `main` or `latest` in production.

The former `@rinspacehq/milkdown-writing-preset` `v0.1.x` releases remain historical plugin-only packages. `@rinspacehq/markdown-writer` starts the page-owning package line at `v0.2.0`; consumers of the earlier package must update their import paths deliberately.

## License and attribution

Rinspace's original page code, plugins, example, and creator in this repository are MIT licensed; see [LICENSE](LICENSE). [Milkdown and Crepe](https://github.com/Milkdown/milkdown) are maintained by the Milkdown project and retain their own MIT license and attribution. CodeMirror, KaTeX, and other dependencies retain their respective licenses. This repository does not claim ownership of Milkdown or its built-in editor features.
