import type { MilkdownPlugin } from '@milkdown/kit/ctx';
import { trailingConfig } from '@milkdown/kit/plugin/trailing';
import { isLatexCodeBlockNode } from '../mathSelection';

export const rinLatexTrailingConfigPlugin: MilkdownPlugin = (ctx) => () => {
  ctx.update(trailingConfig.key, (previous) => ({
    ...previous,
    shouldAppend: (lastNode, state) => {
      if (isLatexCodeBlockNode(lastNode)) return false;
      return previous.shouldAppend(lastNode, state);
    },
  }));
};
