import { GapCursor } from '@milkdown/kit/prose/gapcursor';
import type {
  Node as ProseMirrorNode,
  ResolvedPos,
} from '@milkdown/kit/prose/model';
import {
  Selection,
  TextSelection,
  type Transaction,
} from '@milkdown/kit/prose/state';

const gapCursorWithRuntimeChecks = GapCursor as typeof GapCursor & {
  valid?: ($pos: ResolvedPos) => boolean;
};

export function isLatexCodeBlockNode(
  node: ProseMirrorNode | null | undefined,
): node is ProseMirrorNode {
  return (
    node?.type.name === 'code_block' &&
    String(node.attrs.language || '').toLowerCase() === 'latex'
  );
}

export function insertLatexPlaceholderParagraph(tr: Transaction, pos: number) {
  const paragraph = tr.doc.type.schema.nodes.paragraph?.create();
  if (!paragraph) return false;
  tr.insert(pos, paragraph);
  tr.setSelection(TextSelection.create(tr.doc, Math.min(pos + 1, tr.doc.content.size)));
  return true;
}

export function setGapCursorSelection(tr: Transaction, pos: number) {
  try {
    const resolved = tr.doc.resolve(pos);
    if (!gapCursorWithRuntimeChecks.valid?.(resolved)) return false;
    tr.setSelection(new GapCursor(resolved));
    return true;
  } catch (error: unknown) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

export function selectAfterBlock(
  tr: Transaction,
  afterBlockPos: number,
  preferGapCursor: boolean,
) {
  const safePos = Math.min(afterBlockPos, tr.doc.content.size);
  const resolved = tr.doc.resolve(safePos);
  if (preferGapCursor && setGapCursorSelection(tr, safePos)) return true;

  const nextNode = resolved.nodeAfter;

  if (!nextNode) {
    if (preferGapCursor) {
      try {
        tr.setSelection(Selection.near(resolved, 1));
        return true;
      } catch (error: unknown) {
        if (error instanceof RangeError) return false;
        throw error;
      }
    }

    const paragraph = tr.doc.type.schema.nodes.paragraph?.create();
    if (!paragraph) return false;
    tr.insert(safePos, paragraph);
    tr.setSelection(TextSelection.create(tr.doc, safePos + 1));
    return true;
  }

  if (nextNode.isTextblock) {
    tr.setSelection(TextSelection.create(tr.doc, safePos + 1));
    return true;
  }

  try {
    tr.setSelection(Selection.near(resolved, 1));
  } catch (error: unknown) {
    if (error instanceof RangeError) return false;
    throw error;
  }
  return true;
}

export function selectAfterLatexBlock(tr: Transaction, afterBlockPos: number) {
  const safePos = Math.min(afterBlockPos, tr.doc.content.size);
  const resolved = tr.doc.resolve(safePos);
  const nextNode = resolved.nodeAfter;
  if (nextNode?.isTextblock) {
    tr.setSelection(TextSelection.create(tr.doc, safePos + 1));
    return true;
  }
  if (!nextNode) {
    return insertLatexPlaceholderParagraph(tr, safePos);
  }
  try {
    tr.setSelection(Selection.near(resolved, 1));
    return true;
  } catch (error: unknown) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}
