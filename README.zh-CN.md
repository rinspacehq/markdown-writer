# Milkdown 写作增强预设

[English](README.md)

这是从 Rinspace 提取的八个 Milkdown 小插件，改善 Markdown 的标题、LaTeX 代码块光标、显示公式围栏与快捷键、表格输入。每个插件有独立源码文件，`registerWritingEnhancements` 按验证过的顺序一次注册。

请使用经过审查的精确版本；生产环境不要消费 `latest` 或 Git 分支。

## 一条命令打开本地示例

从 GitHub Release 运行固定版本的发行包：

```sh
npm exec --yes --package=https://github.com/rinspacehq/milkdown-writing-preset/releases/download/v0.1.1/rinspacehq-milkdown-writing-preset-0.1.1.tgz -- milkdown-writing-preset create my-milkdown-page
```

命令会创建带可编辑 React 源码的新目录，把 Milkdown Crepe、Milkdown Kit 和本预设安装在该目录自己的 `node_modules`，检查本地依赖，启动 Vite 服务并打印访问地址。生成的 `package-lock.json` 记录精确依赖树。已有目录不会被覆盖。要求 Node.js 20 或更新版本；按 Ctrl+C 停止服务。这只是本地预览，不会部署到公网。

示例网页顶行是标题输入框，下面是完成配置的 Milkdown 编辑器。页面启用 Crepe 的工具栏、块菜单、顶栏、LaTeX、代码编辑器、表格和链接控件，同时注册公开预设与数学、光标交互。点 **Insert formula** 可编辑 LaTeX 源码，即使预览失败也能继续修改源码。可在 **Markdown source** 中粘贴或查看文档，点 **Import Markdown** 导入，点 **Export Markdown** 下载 `document.md`。在生成的目录运行 `npm run build` 会得到静态 `dist/`，可按自己的托管方式部署。

可在正文输入 `# 小节` 观察 H2，另起段落输入 `$$x^2$$` 生成显示公式，或依次输入 `| A | B |`、`| --- | --- |`、`| 1 | 2 |` 并以空行结束，生成表格。顶部标题字段与正文分开。

验证候选 tarball 时，可在目录名后加 `--package-spec file:/绝对路径/candidate.tgz`。加 `--no-install` 则只生成文件，不安装和启动。

## 接入现有编辑器

安装确定版本及兼容的 Milkdown peer 依赖：

```sh
npm install --save-exact https://github.com/rinspacehq/milkdown-writing-preset/releases/download/v0.1.1/rinspacehq-milkdown-writing-preset-0.1.1.tgz @milkdown/crepe@7.21.2 @milkdown/kit@7.21.2 katex@0.16.25
```

```ts
import { Crepe } from '@milkdown/crepe';
import { registerWritingEnhancements } from '@rinspacehq/milkdown-writing-preset';

const crepe = new Crepe({ root: document.getElementById('editor')! });
registerWritingEnhancements(crepe, { titleMode: 'first-block' });
await crepe.create();
```

宿主还需引入 Crepe 主题 CSS。要获得示例中的完整体验，请启用 Crepe 自带的 LaTeX、CodeMirror、Table 功能。本预设增强输入和光标行为；不负责持久化、上传或发布。

### 八个插件

| 插件 | 行为 |
| --- | --- |
| 标题输入 | 按标题模式把正文中输入的 `# ` 转为 H2。 |
| LaTeX GapCursor | 允许在 LaTeX 代码块旁放置光标。 |
| LaTeX 尾部配置 | 避免 LaTeX 后自动附加多余块。 |
| LaTeX 尾部占位 | 在文末 LaTeX 块后增加可继续输入的段落。 |
| 显示公式围栏合并 | 把成对输入的显示公式围栏合并为 LaTeX 块。 |
| Markdown 表格输入 | 把含分隔行的管道文本转换成表格。 |
| 显示公式快捷键 | 处理 `$$` 与 `$$$$`，并发出打开公式块事件。 |
| 单行显示公式 | 将 `$$formula$$` 转为 LaTeX 块，同时保护行内 `$formula$`。 |

`titleMode: 'first-block'` 保持 Rinspace 现有行为：编辑器首块可以是 H1，后续输入的 H1 变为 H2。页面顶部有独立标题字段时用 `titleMode: 'external'`，正文任何位置输入的 H1 都会变为 H2。输入规则不会重写已导入的标题。

`splitTitleMarkdown` 把文首 H1 拆成 `{ title, body }`；`joinTitleMarkdown` 把标题作为文首 H1 写回。它们保留正文后续的标题。示例使用这两个函数与 `external` 模式。

包还导出数学 Markdown 规范化与粘贴辅助函数。请从包根入口导入，不深层引用源码。显示公式快捷键会发出 `rinspace:open-latex-block-editor` 事件，内容为 `{ requestId, pos }`；生成的页面已将它接入本地公式编辑面板。

Rinspace 使用的 DOM 生命周期可从 `@rinspacehq/milkdown-writing-preset/interactions` 导入 `createWritingInteractions`、`createMathReparseController`、数学命令和 `syncLatexCodeBlockElement`。这个可选入口需要 `katex` peer 依赖。宿主提供自己的公式面板回调、文案、只读状态和编辑器引用；Quiver 留在 Rinspace 适配层。

## 开发与验收

在源码目录运行 `npm run build` 和 `npm pack --dry-run`。正式发行前，要在干净项目和 Rinspace 文章、书籍两个编辑器中安装同一 tarball 测试。固定版本的 `.tgz` 与 SHA-256 校验文件一起附在不可变的 GitHub Release 中；Rinspace 通过精确发行包 URL 和锁文件 integrity 升级，并运行集成检查。不要安装 GitHub 自动生成的源码压缩包，它不是已构建的包。

## 范围与协议

包中没有 Rinspace 账号、API、Quiver、图片上传、自动保存或发布代码。自有源码、示例和创建器采用 MIT 协议，见 [LICENSE](LICENSE)。Milkdown、Crepe、CodeMirror、KaTeX 及第三方素材各自保留原协议。外部贡献须经审查，不会自动同步进 Rinspace。
