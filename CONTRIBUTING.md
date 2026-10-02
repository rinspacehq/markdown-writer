# Contributing / 贡献

Issues and pull requests for the eight writing plugins, Markdown helpers, and minimal demo are welcome. Please keep changes independent of Rinspace accounts, private APIs, uploads, Quiver, and publication services.

Before opening a pull request, run `npm ci`, `npm run build`, `npm test`, and `npm pack --dry-run`. Add a focused fixture when changing Markdown output, heading rules, selection behavior, or shortcuts. Never include production credentials or real user documents.

维护者会审查代码、许可证和打包内容，并在不含生产凭据的环境中运行验证。公共仓库的合并不会自动同步到 Rinspace 产品；产品升级另行进行集成审查。
