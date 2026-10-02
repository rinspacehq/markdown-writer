import { Plugin } from '@milkdown/kit/prose/state';
import { $prose } from '@milkdown/kit/utils';
import { insertLatexPlaceholderParagraph, isLatexCodeBlockNode } from '../mathSelection';

export const rinLatexTrailingPlaceholderPlugin = $prose(() => {
  return new Plugin({
    appendTransaction: (transactions, _oldState, state) => {
      if (!transactions.some((transaction) => transaction.docChanged)) return null;
      const lastNode = state.doc.lastChild;
      if (!isLatexCodeBlockNode(lastNode)) return null;

      const tr = state.tr;
      if (!insertLatexPlaceholderParagraph(tr, state.doc.content.size)) return null;
      return tr;
    },
  });
});
