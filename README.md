# Milkdown Writing Preset

[简体中文](README.zh-CN.md)

Eight small Milkdown plugins from Rinspace that improve Markdown writing: heading input, LaTeX code block cursor flow, display math fences and shortcuts, and typed Markdown tables. Each plugin has its own source file. One `registerWritingEnhancements` call installs them in the tested order.

Use an exact reviewed release. Do not install `latest` or a Git branch into production.

## One-command local demo

Download and run the versioned package from the GitHub Release:

```sh
npm exec --yes --package=https://github.com/rinspacehq/milkdown-writing-preset/releases/download/v0.1.0/rinspacehq-milkdown-writing-preset-0.1.0.tgz -- milkdown-writing-preset create my-milkdown-page
```

The command creates a new directory, installs exact demo dependencies, starts a local Vite server, and prints its URL. It refuses to overwrite an existing directory. Node.js 20 or newer is required. Stop the server with Ctrl+C. This starts a local preview; it does not publish a website.

The page has a title input on top and a Milkdown editor below. Use **Markdown source** to paste or inspect a document, **Import Markdown** to load it, and **Export Markdown** to download `document.md`. To build a static site from the generated directory, run `npm run build`; deploy its `dist/` directory with your own hosting setup.

Try `# Section` in the editor body to see an H2, `$$x^2$$` at the start of a new paragraph for a display formula, or type `| A | B |`, `| --- | --- |`, `| 1 | 2 |` on successive lines followed by a blank line for a table. The title field remains separate from the body.

For a candidate tarball, pass `--package-spec file:/absolute/path/to/candidate.tgz` after the directory name. Add `--no-install` to generate files without installing or starting the server.

## Use in an existing editor

Install an exact release together with compatible Milkdown peers:

```sh
npm install --save-exact https://github.com/rinspacehq/milkdown-writing-preset/releases/download/v0.1.0/rinspacehq-milkdown-writing-preset-0.1.0.tgz @milkdown/crepe@7.21.2 @milkdown/kit@7.21.2 katex@0.16.25
```

```ts
import { Crepe } from '@milkdown/crepe';
import { registerWritingEnhancements } from '@rinspacehq/milkdown-writing-preset';

const crepe = new Crepe({ root: document.getElementById('editor')! });
registerWritingEnhancements(crepe, { titleMode: 'first-block' });
await crepe.create();
```

Import the Crepe theme CSS in your app. Enable Crepe's LaTeX, CodeMirror and Table features for the full demo behavior. The preset adds input and cursor behavior; it does not replace those Milkdown features or provide persistence, uploads or a publication service.

### Included plugins

| Plugin | Behavior |
| --- | --- |
| Heading input | Converts typed body `# ` to H2 according to the title mode. |
| LaTeX gap cursor | Enables a cursor beside LaTeX code blocks. |
| LaTeX trailing config | Avoids an unwanted trailing block after LaTeX. |
| LaTeX trailing placeholder | Adds a writable paragraph after a final LaTeX block. |
| Display math fence merge | Converts typed paired display math fences into one LaTeX block. |
| Markdown table input | Converts typed pipe rows with a separator into a table. |
| Display math shortcut | Handles `$$` and `$$$$` shortcuts and emits the LaTeX block open event. |
| Single-line display math | Converts `$$formula$$` to a LaTeX block and guards inline `$formula$`. |

`titleMode: 'first-block'` preserves Rinspace's existing rule: the first editor block may be H1; later typed H1 markers become H2. `titleMode: 'external'` is for a separate title field and converts typed H1 markers in every body block. The input rule does not rewrite existing imported headings.

`splitTitleMarkdown` reads a leading Markdown H1 into `{ title, body }`; `joinTitleMarkdown` writes the title as the document's leading H1. They leave later body headings intact. The demo uses these helpers and `titleMode: 'external'`.

The package also exports math Markdown normalization and paste helpers. Use the documented package root export, not internal source paths. The display math shortcut emits `rinspace:open-latex-block-editor` with `{ requestId, pos }`; a host may listen for it to open its own formula panel. The basic demo relies on Crepe's built-in editing UI.

For the DOM lifecycle used by Rinspace, import `createWritingInteractions`, `createMathReparseController`, the math commands and `syncLatexCodeBlockElement` from `@rinspacehq/milkdown-writing-preset/interactions`. This optional entry needs `katex` as a peer. The host supplies its own formula panel callbacks, labels, read-only state and editor refs; Quiver stays in the Rinspace adapter.

## Development and checks

In the source directory, run `npm run build` and `npm pack --dry-run`. Test the packed tarball in a clean project and in both Rinspace article and book editors before a release. The versioned `.tgz` is attached to an immutable GitHub Release alongside its SHA-256 checksum. Rinspace upgrades by changing the exact release asset URL and lockfile integrity, then running its integration checks. Do not install the repository's generated source archive: it is not the built package.

## Scope and license

The package contains no Rinspace account, API, Quiver, image upload, autosave or publication code. Its own source, example and creator are MIT licensed; see [LICENSE](LICENSE). Milkdown, Crepe, CodeMirror, KaTeX and any third-party assets retain their own licenses. Contributions require review and do not flow automatically into Rinspace.
