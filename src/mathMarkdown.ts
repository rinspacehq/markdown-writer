import { editorViewCtx } from '@milkdown/kit/core';
import type { Ctx } from '@milkdown/kit/ctx';
import {
  Selection,
  type SelectionBookmark,
} from '@milkdown/kit/prose/state';
import { insert, replaceAll } from '@milkdown/kit/utils';

export function hasCompleteDisplayMathFence(markdown: string) {
  return /(?:^|\n)(?:\$\$\s*\n[\s\S]+?\n\$\$|\$\$[^\n$]+?\$\$[^\n]*|\\\[\s*\n[\s\S]+?\n\\\])(?=\n|$)/.test(markdown);
}

function hasMarkdownMath(markdown: string) {
  return (
    hasCompleteDisplayMathFence(markdown) ||
    /(^|[^\w$])\$[^$\n]+\$(?=$|[^\w$])/.test(markdown) ||
    /\\\([^]*?\\\)|\\\[[^]*?\\\]/.test(markdown)
  );
}

function looksLikeCodeEditorClipboardHTML(html: string) {
  const normalized = html.toLocaleLowerCase();
  return (
    /white-space\s*:\s*pre(?:-wrap)?/.test(normalized) &&
    /font-family\s*:[^;]*(?:consolas|courier|monospace)/.test(normalized)
  );
}

export function shouldPasteClipboardAsMarkdown(
  plainText: string,
  htmlText: string,
) {
  if (!plainText) return false;
  return hasMarkdownMath(plainText) || looksLikeCodeEditorClipboardHTML(htmlText);
}

export function markdownMathForMilkdown(markdown: string) {
  return markdown
    .replace(
      /(^|\n)\$\$[ \t]*([^\n$]+?)[ \t]*\$\$([^\n]*)/g,
      (_match: string, lead: string, body: string, suffix: string) => {
        const trailingText = suffix.trimStart();
        return trailingText
          ? `${lead}$$\n${body}\n$$\n${trailingText}`
          : `${lead}$$\n${body}\n$$`;
      },
    )
    .replace(/\\\[\s*\n?([\s\S]*?)\n?\s*\\\]/g, '$$\n$1\n$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
}

function looksLikeWholeMarkdownDocument(markdown: string) {
  const text = markdown.replace(/\r\n?/g, '\n').trim();
  if (!text.includes('\n')) return false;
  return (
    /^#\s+\S/m.test(text) ||
    /^#{2,6}\s+\S/m.test(text) ||
    /^```/m.test(text) ||
    /^\|.+\|/m.test(text)
  );
}

function selectionCoversDocument(selection: Selection, documentSize: number) {
  return selection.from <= 1 && selection.to >= Math.max(1, documentSize - 1);
}

function shouldReplaceDocumentOnPaste(ctx: Ctx, markdown: string) {
  if (!looksLikeWholeMarkdownDocument(markdown)) return false;
  const view = ctx.get(editorViewCtx);
  const { state } = view;
  const docText = state.doc.textContent.trim();
  return docText.length === 0 || selectionCoversDocument(state.selection, state.doc.content.size);
}

export function pasteMarkdownMathInCtx(ctx: Ctx, markdown: string) {
  const milkdownMarkdown = markdownMathForMilkdown(markdown);
  if (shouldReplaceDocumentOnPaste(ctx, milkdownMarkdown)) {
    replaceAll(milkdownMarkdown, true)(ctx);
    return;
  }
  insert(milkdownMarkdown)(ctx);
}

export function restoreSelectionBookmarkInCtx(ctx: Ctx, bookmark: SelectionBookmark) {
  const view = ctx.get(editorViewCtx);
  try {
    const selection = bookmark.resolve(view.state.doc);
    view.dispatch(view.state.tr.setSelection(selection));
    view.focus();
    return true;
  } catch (error: unknown) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

export function normalizeMilkdownMathMarkdown(markdown: string) {
  return markdown
    .replace(/(^|\n)\\\[\n([\s\S]*?)(?:\n)?\\\]\n\\\](?=\n|$)/g, '$1\\[\n$2\n\\]')
    .replace(/(^|\n)\\\[\n([\s\S]*?)\n\\\]\n\\\](?=\n|$)/g, '$1\\[\n$2\n\\]');
}

export function normalizeLatexBlockEditorValue(value: string) {
  const text = value.replace(/\r\n?/g, '\n').trim();
  const blockFence = /^\$\$(?:\s*\n)?([\s\S]*?)(?:\n\s*)?\$\$$/;
  const bracketFence = /^\\\[(?:\s*\n)?([\s\S]*?)(?:\n\s*)?\\\]$/;
  const blockMatch = blockFence.exec(text);
  if (blockMatch?.[1] !== undefined) return blockMatch[1].trim();
  const bracketMatch = bracketFence.exec(text);
  if (bracketMatch?.[1] !== undefined) return bracketMatch[1].trim();
  return value;
}
