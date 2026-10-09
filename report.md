# 修复报告

日期：2026-10-09

## 1. 代码粘贴被错误解析为 Markdown

**问题：** 从 CodeMirror 等代码编辑器复制的内容带有等宽字体和预格式化 HTML。原来的粘贴分类器仅凭这些样式就把普通源代码送入 Markdown 解析器，因此 `# comment`、反引号和列表标记会被转换为编辑器结构，而不是保留为代码文本。

**修复：** `src/mathMarkdown.ts` 现在将代码编辑器 HTML 与数学 Markdown 区分处理：数学内容仍进行数学格式转换；普通源代码会被包入长度足够的 Markdown 代码围栏，再交给 Milkdown 插入为代码块。围栏会比源代码中最长的反引号序列多一个，避免嵌套反引号截断代码。

**回归保护：** `tests/mathMarkdown.test.ts` 覆盖了带 CodeMirror 风格 HTML 的 `const x = 1;`，断言其不会进入数学 Markdown 路径、会被识别为代码块粘贴，并验证嵌套反引号的围栏安全性。真实浏览器回归也验证了 `# code comment` 与下一行代码会完整保留在 Milkdown 代码块中。

## 2. 演示项目的图片 Blob URL 未及时释放

**问题：** 本地封面和正文图片使用 `URL.createObjectURL`，旧实现没有在移除图片或卸载页面时完整释放，长时间编辑大图可能持续占用内存。

**修复：** `template/src/main.tsx` 维护已创建 URL 与待插入 URL 的集合：替换/移除封面时立即释放；正文图片从 Markdown 删除后释放；组件卸载时释放全部剩余 URL。待插入 URL 在真正写入 Markdown 前不会被提前回收。

## 3. 依赖漏洞与 CI 缺少安全门禁

**问题：** 原依赖树包含 KaTeX、Milkdown 和 Vitest/Tinypool 的已知漏洞，CI 未运行依赖审计。

**修复：**

- 将 Milkdown 更新至 `7.22.2`。
- 将 KaTeX 更新并锁定为 `0.19.0`；`overrides` 同时约束 Milkdown 的传递 KaTeX 版本。
- 将 Vitest 更新至 `5.0.3`。
- 在 `.github/workflows/ci.yml` 中新增 `npm audit --audit-level=high`。

## 验证命令

```sh
npm test
npm run build
npm pack --dry-run
npm audit --audit-level=high
```

另外，使用 `node bin/create-demo.mjs create <temp-dir> --no-install --package-spec file:D:\markdown-writer` 生成临时项目，随后在该项目中执行 `npm install` 与 `npm run build`，已验证模板会在真实安装场景下通过 TypeScript 检查和生产构建。

这些命令在本次修复后用于验证代码、模板、发布内容和依赖安全。
