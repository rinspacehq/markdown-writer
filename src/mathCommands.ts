import type { Crepe } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/kit/core';
import type { Ctx } from '@milkdown/kit/ctx';
import { codeBlockSchema } from '@milkdown/kit/preset/commonmark';
import type { Node as ProseMirrorNode } from '@milkdown/kit/prose/model';
import {
  Selection,
  TextSelection,
  type Transaction,
} from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';

import {
  isLatexCodeBlockNode,
  selectAfterBlock,
  selectAfterLatexBlock,
  setGapCursorSelection,
} from './mathSelection';
function removeClosingMathFence(content: string) {
  const normalized = content.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const closingLine = lines[lines.length - 1]?.trim();
  if (closingLine !== '$$' && closingLine !== '\\]') return null;
  lines.pop();
  while (lines.length > 1 && lines[lines.length - 1]?.trim() === '') {
    lines.pop();
  }
  return lines.join('\n');
}
export function closeActiveLatexBlockFence(editor: Crepe) {
  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const { state } = view;
    const { $from } = state.selection;
    let codeBlockDepth = -1;

    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (
        node.type.name === 'code_block' &&
        String(node.attrs.language || '').toLowerCase() === 'latex'
      ) {
        codeBlockDepth = depth;
        break;
      }
    }

    if (codeBlockDepth < 0) return false;

    const codeBlock = $from.node(codeBlockDepth);
    const nextContent = removeClosingMathFence(codeBlock.textContent);
    if (nextContent === null) return false;

    const codeBlockPos = $from.before(codeBlockDepth);
    const nextCodeBlock = codeBlock.type.create(
      codeBlock.attrs,
      nextContent ? state.schema.text(nextContent) : null,
      codeBlock.marks,
    );
    const tr = state.tr.replaceWith(
      codeBlockPos,
      codeBlockPos + codeBlock.nodeSize,
      nextCodeBlock,
    );
    if (!selectAfterLatexBlock(tr, codeBlockPos + nextCodeBlock.nodeSize)) return false;
    view.dispatch(tr.scrollIntoView());
    view.focus();
    return true;
  });
}

export function insertLatexBlockInCtx(ctx: Ctx, value = ''): number | false {
  const view = ctx.get(editorViewCtx);
  const { state } = view;
  let { selection } = state;
  const domSelection = window.getSelection();
  const anchorNode = domSelection?.anchorNode;
  if (domSelection?.isCollapsed && anchorNode && view.dom.contains(anchorNode)) {
    try {
      const domPos = view.posAtDOM(anchorNode, domSelection.anchorOffset);
      const textPos = [domPos, domPos + 1, domPos - 1]
        .map((pos) => Math.min(Math.max(1, pos), state.doc.content.size))
        .find((pos) => state.doc.resolve(pos).parent.inlineContent);
      if (textPos !== undefined) {
        selection = TextSelection.create(state.doc, textPos);
      }
    } catch (error: unknown) {
      if (!(error instanceof RangeError)) throw error;
    }
  }
  const codeBlockType = codeBlockSchema.type(ctx);

  const codeBlock = codeBlockType.create(
    { language: 'LaTeX' },
    value ? state.schema.text(value) : null,
  );
  const { $from } = selection;
  const parent = $from.parent;
  let tr = state.tr;
  let blockPos = selection.from;

  if (selection.empty && parent.isTextblock && $from.depth > 0) {
    const currentBlockPos = $from.before($from.depth);
    const afterCurrentBlock = currentBlockPos + parent.nodeSize;
    if (parent.type.name === 'paragraph' && parent.content.size === 0) {
      blockPos = currentBlockPos;
      tr = tr.replaceWith(currentBlockPos, afterCurrentBlock, codeBlock);
    } else {
      blockPos = afterCurrentBlock;
      tr = tr.insert(blockPos, codeBlock);
    }
  } else {
    tr = tr.replaceWith(selection.from, selection.to, codeBlock);
  }

  tr.setSelection(TextSelection.create(tr.doc, blockPos + 1));
  view.dispatch(tr.scrollIntoView());
  view.focus();
  return blockPos;
}
function inlineMathNodeInfo(editor: Crepe, element: HTMLElement) {
  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const basePos = view.posAtDOM(element, 0);
    const positions = Array.from(new Set([basePos, basePos - 1, basePos + 1]));
    const match = positions.find((pos) => {
      if (pos < 0 || pos > view.state.doc.content.size) return false;
      return view.state.doc.nodeAt(pos)?.type.name === 'math_inline';
    });

    if (match === undefined) return null;

    const node = view.state.doc.nodeAt(match);
    if (!node) return null;
    return {
      pos: match,
      value: String(node.attrs.value || ''),
    };
  });
}

function updateInlineMathNode(editor: Crepe, pos: number, value: string) {
  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const node = view.state.doc.nodeAt(pos);
    if (!node || node.type.name !== 'math_inline') return false;

    const trimmed = value.trim();
    const tr = trimmed
      ? view.state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          value: trimmed,
        })
      : view.state.tr.delete(pos, pos + node.nodeSize);
    view.dispatch(tr.scrollIntoView());
    view.focus();
    return true;
  });
}

export type LatexBlockEditorState = {
  pos: number;
  value: string;
  top: number;
  left: number;
  width: number;
};

export function latexBlockNodeInfo(editor: Crepe, element: HTMLElement) {
  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const basePos = view.posAtDOM(element, 0);
    const positions = Array.from(
      new Set([basePos, basePos - 2, basePos - 1, basePos + 1, basePos + 2]),
    );
    const match = positions.find((pos) => {
      if (pos < 0 || pos > view.state.doc.content.size) return false;
      const node = view.state.doc.nodeAt(pos);
      return (
        node?.type.name === 'code_block' &&
        String(node.attrs.language || '').toLowerCase() === 'latex'
      );
    });

    if (match === undefined) return null;

    const node = view.state.doc.nodeAt(match);
    if (!node) return null;
    return {
      pos: match,
      value: node.textContent,
    };
  });
}

export function updateLatexBlockNode(
  editor: Crepe,
  pos: number,
  value: string,
  focusAfter = false,
) {
  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    let targetPos = pos;
    let node = (() => {
      try {
        return view.state.doc.nodeAt(targetPos);
      } catch (error: unknown) {
        if (error instanceof RangeError) return null;
        throw error;
      }
    })();
    if (
      !node ||
      node.type.name !== 'code_block' ||
      String(node.attrs.language || '').toLowerCase() !== 'latex'
    ) {
      let fallbackPos: number | null = null;
      let fallbackDistance = Number.POSITIVE_INFINITY;
      view.state.doc.descendants((candidate, candidatePos) => {
        if (
          candidate.type.name !== 'code_block' ||
          String(candidate.attrs.language || '').toLowerCase() !== 'latex'
        ) {
          return true;
        }
        const isGoodMatch = candidate.textContent === value || candidate.textContent === '';
        if (!isGoodMatch) return true;
        const distance = Math.abs(candidatePos - pos);
        if (distance < fallbackDistance) {
          fallbackDistance = distance;
          fallbackPos = candidatePos;
        }
        return true;
      });
      if (fallbackPos !== null) {
        targetPos = fallbackPos;
        node = view.state.doc.nodeAt(targetPos);
      }
    }
    if (
      !node ||
      node.type.name !== 'code_block' ||
      String(node.attrs.language || '').toLowerCase() !== 'latex'
    ) {
      return false;
    }

    if (node.textContent === value && !focusAfter) {
      return true;
    }

    const nextNode = node.type.create(
      node.attrs,
      value ? view.state.schema.text(value) : null,
      node.marks,
    );
    const tr = view.state.tr.replaceWith(targetPos, targetPos + node.nodeSize, nextNode);
    if (focusAfter) {
      const afterBlockPos = targetPos + nextNode.nodeSize;
      if (!selectAfterLatexBlock(tr, afterBlockPos)) return false;
    }
    view.dispatch(tr.scrollIntoView());
    if (focusAfter) view.focus();
    return true;
  });
}

function codeBlockNodeInfo(editor: Crepe, element: HTMLElement) {
  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const basePos = view.posAtDOM(element, 0);
    const positions = Array.from(
      new Set([basePos, basePos - 2, basePos - 1, basePos + 1, basePos + 2]),
    );
    const match = positions.find((pos) => {
      if (pos < 0 || pos > view.state.doc.content.size) return false;
      return view.state.doc.nodeAt(pos)?.type.name === 'code_block';
    });

    if (match === undefined) return null;

    const node = view.state.doc.nodeAt(match);
    if (!node) return null;
    return {
      pos: match,
      attrs: node.attrs,
      content: codeBlockElementContent(element) ?? node.textContent,
    };
  });
}

function codeBlockElementContent(block: HTMLElement) {
  const lines = Array.from(block.querySelectorAll('.cm-content .cm-line'));
  if (lines.length > 0) {
    return lines.map((line) => line.textContent || '').join('\n');
  }

  const content = block.querySelector('.cm-content');
  if (content instanceof HTMLElement) return content.textContent || '';

  const placeholder = block.querySelector('.milkdown-code-block-placeholder code');
  if (placeholder instanceof HTMLElement) return placeholder.textContent || '';

  return null;
}

function removeClosingCodeFence(content: string) {
  const normalized = content.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  while (lines.length > 1 && lines[lines.length - 1]?.trim() === '') {
    lines.pop();
  }
  if (lines[lines.length - 1]?.trim() !== '```') return null;
  lines.pop();
  return lines.join('\n');
}

function typedCodeFenceInfoString(content: string) {
  const text = content.replace(/\r\n?/g, '\n').trim();
  if (!/^[A-Za-z][A-Za-z0-9_+#.-]{0,31}$/.test(text)) return '';
  return text;
}

export function promoteActiveCodeBlockInfoString(editor: Crepe, block: HTMLElement) {
  const info = codeBlockNodeInfo(editor, block);
  if (!info || String(info.attrs.language || '').trim()) return false;

  const language = typedCodeFenceInfoString(info.content);
  if (!language) return false;

  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const node = view.state.doc.nodeAt(info.pos);
    if (
      !node ||
      node.type.name !== 'code_block' ||
      String(node.attrs.language || '').trim()
    ) {
      return false;
    }

    const nextNode = node.type.create(
      {
        ...node.attrs,
        language,
      },
      null,
      node.marks,
    );
    const tr = view.state.tr.replaceWith(info.pos, info.pos + node.nodeSize, nextNode);
    tr.setSelection(TextSelection.create(tr.doc, info.pos + 1));
    view.dispatch(tr.scrollIntoView());
    view.focus();
    return true;
  });
}

export function closeActiveCodeBlockFence(editor: Crepe, block: HTMLElement) {
  const info = codeBlockNodeInfo(editor, block);
  if (!info || String(info.attrs.language || '').toLowerCase() === 'latex') {
    return false;
  }

  const nextContent = removeClosingCodeFence(info.content);
  if (nextContent === null) return false;

  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const node = view.state.doc.nodeAt(info.pos);
    if (
      !node ||
      node.type.name !== 'code_block' ||
      String(node.attrs.language || '').toLowerCase() === 'latex'
    ) {
      return false;
    }

    const nextNode = node.type.create(
      node.attrs,
      nextContent ? view.state.schema.text(nextContent) : null,
      node.marks,
    );
    const tr = view.state.tr.replaceWith(info.pos, info.pos + node.nodeSize, nextNode);
    if (!selectAfterBlock(tr, info.pos + nextNode.nodeSize, false)) return false;
    view.dispatch(tr.scrollIntoView());
    forceProseMirrorFocus(view);
    window.requestAnimationFrame(() => forceProseMirrorFocus(view));
    window.setTimeout(() => forceProseMirrorFocus(view), 50);
    return true;
  });
}

export function hasActiveCodeBlockClosingFence(editor: Crepe, block: HTMLElement) {
  const info = codeBlockNodeInfo(editor, block);
  return Boolean(
    info &&
      String(info.attrs.language || '').toLowerCase() !== 'latex' &&
      removeClosingCodeFence(info.content) !== null,
  );
}

export function focusParagraphElementInCtx(ctx: Ctx, paragraph: HTMLElement) {
  const view = ctx.get(editorViewCtx);
  let paragraphPos = 0;
  try {
    paragraphPos = view.posAtDOM(paragraph, 0);
  } catch (error: unknown) {
    if (error instanceof RangeError) return false;
    throw error;
  }

  const maxPos = view.state.doc.content.size;
  const textPos = [paragraphPos, paragraphPos + 1, paragraphPos - 1]
    .map((pos) => Math.min(Math.max(1, pos), maxPos))
    .find((pos) => {
      const resolved = view.state.doc.resolve(pos);
      return resolved.parent.inlineContent;
    });
  const tr = view.state.tr;
  if (textPos !== undefined) {
    tr.setSelection(TextSelection.create(tr.doc, textPos));
  } else {
    const nearPos = Math.min(Math.max(1, paragraphPos), maxPos);
    try {
      tr.setSelection(Selection.near(tr.doc.resolve(nearPos), 1));
    } catch (error: unknown) {
      if (error instanceof RangeError) return false;
      throw error;
    }
  }
  view.dispatch(tr.scrollIntoView());
  view.focus();
  return true;
}

function forceProseMirrorFocus(view: EditorView) {
  const activeElement = document.activeElement;
  if (
    activeElement instanceof HTMLElement &&
    activeElement !== view.dom &&
    view.dom.contains(activeElement)
  ) {
    activeElement.blur();
  }
  view.dom.focus({ preventScroll: true });
  view.focus();
}

export function deleteLatexBlockBeforeParagraphInCtx(ctx: Ctx, paragraph: HTMLElement) {
  const view = ctx.get(editorViewCtx);
  let paragraphPos = 0;
  try {
    paragraphPos = view.posAtDOM(paragraph, 0);
  } catch (error: unknown) {
    if (error instanceof RangeError) return false;
    throw error;
  }

  const maxPos = view.state.doc.content.size;
  const safeParagraphPos = Math.min(Math.max(0, paragraphPos), maxPos);
  let paragraphFrom = safeParagraphPos;
  if (view.state.doc.nodeAt(paragraphFrom)?.type.name !== 'paragraph') {
    const resolvedPos = Math.min(Math.max(1, paragraphPos), maxPos);
    const resolved = view.state.doc.resolve(resolvedPos);
    if (resolved.parent.type.name !== 'paragraph' || resolved.depth <= 0) {
      return false;
    }
    paragraphFrom = resolved.before(resolved.depth);
  }

  const resolved = view.state.doc.resolve(paragraphFrom);
  const previous = resolved.nodeBefore;
  if (
    !previous ||
    previous.type.name !== 'code_block' ||
    String(previous.attrs.language || '').toLowerCase() !== 'latex'
  ) {
    return false;
  }

  const blockFrom = Math.max(0, paragraphFrom - previous.nodeSize);
  const tr = view.state.tr.delete(blockFrom, paragraphFrom);
  const nextParagraphPos = tr.mapping.map(paragraphFrom, -1);
  const selectionPos = Math.min(nextParagraphPos + 1, tr.doc.content.size);
  tr.setSelection(TextSelection.create(tr.doc, selectionPos));
  view.dispatch(tr.scrollIntoView());
  view.focus();
  return true;
}

function selectWritablePositionAfterDelete(tr: Transaction, pos: number) {
  const safePos = Math.min(Math.max(0, pos), tr.doc.content.size);
  const resolved = tr.doc.resolve(safePos);
  if (setGapCursorSelection(tr, safePos)) return true;

  const nextNode = resolved.nodeAfter;
  if (nextNode?.isTextblock) {
    tr.setSelection(TextSelection.create(tr.doc, safePos + 1));
    return true;
  }

  try {
    tr.setSelection(Selection.near(resolved, -1));
    return true;
  } catch (error: unknown) {
    if (error instanceof RangeError) {
      const paragraph = tr.doc.type.schema.nodes.paragraph?.create();
      if (!paragraph) return false;
      tr.insert(safePos, paragraph);
      tr.setSelection(TextSelection.create(tr.doc, safePos + 1));
      return true;
    }
    throw error;
  }
}

function latexBlockBeforeCurrentSelection(state: {
  selection: Selection;
  doc: ProseMirrorNode;
}) {
  const { selection } = state;
  if (!selection.empty) return null;

  const directPrevious = selection.$from.nodeBefore;
  if (isLatexCodeBlockNode(directPrevious)) {
    return {
      from: selection.from - directPrevious.nodeSize,
      to: selection.from,
      paragraphFrom: null,
    };
  }

  const { $from } = selection;
  const parent = $from.parent;
  if (parent.type.name !== 'paragraph' || parent.content.size !== 0 || $from.depth <= 0) {
    return null;
  }

  const paragraphFrom = $from.before($from.depth);
  const previous = state.doc.resolve(paragraphFrom).nodeBefore;
  if (!isLatexCodeBlockNode(previous)) return null;

  return {
    from: paragraphFrom - previous.nodeSize,
    to: paragraphFrom,
    paragraphFrom,
  };
}

export function deleteLatexBlockBeforeSelectionInCtx(ctx: Ctx) {
  const view = ctx.get(editorViewCtx);
  const { state } = view;
  const info = latexBlockBeforeCurrentSelection(state);
  if (!info) return false;

  const tr = state.tr.delete(info.from, info.to);
  const selectionPos = info.paragraphFrom ?? info.from;
  if (!selectWritablePositionAfterDelete(tr, selectionPos)) return false;
  view.dispatch(tr.scrollIntoView());
  view.focus();
  return true;
}

export function focusAfterLatexBlock(editor: Crepe, pos: number) {
  return editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const node = view.state.doc.nodeAt(pos);
    if (
      !node ||
      node.type.name !== 'code_block' ||
      String(node.attrs.language || '').toLowerCase() !== 'latex'
    ) {
      return false;
    }

    const afterBlockPos = pos + node.nodeSize;
    const tr = view.state.tr;
    if (!selectAfterLatexBlock(tr, afterBlockPos)) return false;
    view.dispatch(tr.scrollIntoView());
    view.focus();
    return true;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function openInlineMathPopover(
  editor: Crepe,
  element: HTMLElement,
  onClose: () => void,
  labels: {
    ariaLabel: string;
    save: string;
    cancel: string;
  } = {
    ariaLabel: 'Edit inline formula',
    save: 'Done',
    cancel: 'Cancel',
  },
) {
  const info = inlineMathNodeInfo(editor, element);
  if (!info) return null;

  const form = document.createElement('form');
  form.className = 'milkdown-inline-math-popover';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = info.value;
  input.setAttribute('aria-label', labels.ariaLabel);

  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.textContent = labels.save;

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = labels.cancel;

  form.append(input, saveButton, cancelButton);
  document.body.appendChild(form);

  const rect = element.getBoundingClientRect();
  const width = Math.min(420, Math.max(260, window.innerWidth - 24));
  form.style.width = `${width}px`;
  form.style.left = `${clamp(
    rect.left + window.scrollX,
    12,
    window.scrollX + window.innerWidth - width - 12,
  )}px`;
  form.style.top = `${rect.bottom + window.scrollY + 8}px`;

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('mousedown', handleOutsidePointer, true);
    document.removeEventListener('keydown', handleEscape, true);
    form.remove();
    onClose();
  };

  const save = () => {
    updateInlineMathNode(editor, info.pos, input.value);
    close();
  };

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    save();
  }

  function handleCancel() {
    close();
  }

  function handleOutsidePointer(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (form.contains(target) || element.contains(target)) return;
    close();
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close();
  }

  form.addEventListener('submit', handleSubmit);
  cancelButton.addEventListener('click', handleCancel);
  document.addEventListener('mousedown', handleOutsidePointer, true);
  document.addEventListener('keydown', handleEscape, true);
  window.setTimeout(() => {
    input.focus();
    input.select();
  }, 0);

  return () => {
    form.removeEventListener('submit', handleSubmit);
    cancelButton.removeEventListener('click', handleCancel);
    close();
  };
}
