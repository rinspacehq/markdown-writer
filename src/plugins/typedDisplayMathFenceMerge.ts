import { codeBlockSchema } from '@milkdown/kit/preset/commonmark';
import type { Node as ProseMirrorNode } from '@milkdown/kit/prose/model';
import { Plugin } from '@milkdown/kit/prose/state';
import { $prose } from '@milkdown/kit/utils';
import { isLatexCodeBlockNode, selectAfterLatexBlock } from '../mathSelection';

function isEmptyLatexFenceBlock(node: ProseMirrorNode | null | undefined) {
  return isLatexCodeBlockNode(node) && node.textContent.trim() === '';
}

function trimBlankFormulaLines(lines: string[]) {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === '') start += 1;
  while (end > start && lines[end - 1].trim() === '') end -= 1;
  return lines.slice(start, end).join('\n');
}

export const rinTypedDisplayMathFenceMergePlugin = $prose((ctx) => {
  return new Plugin({
    appendTransaction: (transactions, _oldState, state) => {
      if (!transactions.some((transaction) => transaction.docChanged)) return null;

      const positions: number[] = [];
      let pos = 0;
      state.doc.forEach((node) => {
        positions.push(pos);
        pos += node.nodeSize;
      });

      for (let index = 0; index < state.doc.childCount; index += 1) {
        const openFence = state.doc.child(index);
        if (!isEmptyLatexFenceBlock(openFence)) continue;

        const formulaLines: string[] = [];
        for (let closeIndex = index + 1; closeIndex < state.doc.childCount; closeIndex += 1) {
          const node = state.doc.child(closeIndex);
          if (isEmptyLatexFenceBlock(node)) {
            const content = trimBlankFormulaLines(formulaLines);
            if (!content.trim()) break;

            const codeBlockType = codeBlockSchema.type(ctx);
            const nextCodeBlock = codeBlockType.create(
              { language: 'LaTeX' },
              state.schema.text(content),
            );
            const from = positions[index];
            const to = positions[closeIndex] + node.nodeSize;
            const tr = state.tr.replaceWith(from, to, nextCodeBlock);
            if (!selectAfterLatexBlock(tr, from + nextCodeBlock.nodeSize)) return null;
            return tr;
          }

          if (node.type.name !== 'paragraph') break;
          formulaLines.push(node.textContent);
        }
      }

      return null;
    },
  });
});
