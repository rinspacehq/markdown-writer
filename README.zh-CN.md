# Rinspace Markdown Writer

[English](README.md)

这个写作页面基于 [Milkdown](https://github.com/Milkdown/milkdown) 及其 Crepe 编辑器。编辑器框架和内建编辑功能来自 Milkdown；Rinspace 维护页面外壳、接入代码，以及针对标题、数学、表格和光标行为的八项写作增强。上游项目与许可证见[协议与致谢](#协议与致谢)。

公开的标题字段和 Milkdown 编辑器是 Rinspace `/write/markdown` 实际消费的源码。网站通过私有适配器接入账号相关控件：标签、封面上传、图片存储、Quiver、草稿、保存和发布。一键生成的页面直接运行公开源码，贡献者因此可以在与 Rinspace 共用的写作区域验证改动。

## 运行页面

`v0.2.0` GitHub Release 提供一条命令创建本地 React 项目、安装精确版本的包并启动 Vite：

```sh
npm exec --yes --package=https://github.com/rinspacehq/markdown-writer/releases/download/v0.2.0/rinspacehq-markdown-writer-0.2.0.tgz -- markdown-writer create my-markdown-writer
```

需要 Node.js 20 或更新版本。命令不会覆盖已有目录，会打印本地地址；按 Ctrl+C 停止。在生成目录运行 `npm run build` 可得到 `dist/` 静态文件，再由你自行托管。上述命令不会把页面发布到公网。

发行前验证候选包可执行：

```sh
npm ci
npm run build
npm pack
node bin/create-demo.mjs create my-markdown-writer --package-spec file:/绝对路径/rinspacehq-markdown-writer-0.2.0.tgz
```

页面保留文章标题、Milkdown 写作区域、工具栏、全屏控件和同源的 LaTeX 编辑面板，默认打开空白文档。它不要求 Rinspace 账号，也不访问 Rinspace 服务。页面没有标签选择、封面上传、图片上传、Quiver、保存、发布、本地文件导入或 Markdown 源码框。

## 同源代码与公开接口

`@rinspacehq/markdown-writer/writer` 导出产品写作区域的共同代码：

- `WriterTitleField` 和 `WriterEditorFrame` 渲染标题与编辑器边框。
- `createWriterEditor` 以同一份配置构造 Crepe 和写作插件。站内宿主可通过 `extendTopBar` 添加私有控件，并注入图片上传适配器；公开页面不传入这两项。
- `syncWriterTitle` 和 Markdown 标题工具维护标题与文首 H1 的关系。
- `applyWriterTopBarLabels` 为工具栏提供可访问名称。
- `@rinspacehq/markdown-writer/writer.css` 包含从 Rinspace 写作页迁出的编辑区域样式。

`/latex-editor` 导出同源 LaTeX 块面板和选区生命周期，`/code-editor` 导出共用的 CodeMirror 控件。包根入口提供八项写作插件和 Markdown 工具，`/interactions` 提供光标、粘贴、数学及重新解析逻辑。请使用这些公开入口，不要深层导入内部文件。

Milkdown Crepe 的 LaTeX、CodeMirror、Table、Toolbar、BlockEdit、TopBar 和 LinkTooltip 仍是 Milkdown 的内建功能。Rinspace 的八项插件增加经验证的输入与光标行为；公开页面和 Rinspace 都通过同一个 `createWriterEditor` 注册它们。

## 贡献与发行

运行 `npm ci`、`npm run build`、`npm test`、`npm pack --dry-run`，再用打包后的 tarball 在干净目录验证一键页面。页面改动还须让 Rinspace 的 Markdown 文章和书籍编辑器对同一个 tarball 完成集成检查。公开改动只有经过维护者审查、不可变 GitHub Release 和私仓精确依赖及锁文件完整性更新后，才会进入产品。生产不消费 `main` 或 `latest`。

原 `@rinspacehq/milkdown-writing-preset` 的 `v0.1.x` 发行版保留为历史插件包。`@rinspacehq/markdown-writer` 从 `v0.2.0` 开始维护页面；旧包使用者需要主动更新导入路径。

## 协议与致谢

本仓库中由 Rinspace 编写的页面代码、插件、示例和创建器采用 MIT 协议，见 [LICENSE](LICENSE)。[Milkdown 与 Crepe](https://github.com/Milkdown/milkdown) 由 Milkdown 项目维护，保留其 MIT 协议和归属。CodeMirror、KaTeX 等依赖也分别保留各自许可证。本仓库不声称拥有 Milkdown 或其内建编辑功能。
