import { inputRulesCtx, SchemaReady } from '@milkdown/kit/core';
import type { MilkdownPlugin } from '@milkdown/kit/ctx';
import { codeBlockSchema } from '@milkdown/kit/preset/commonmark';
import { InputRule } from '@milkdown/kit/prose/inputrules';
import { selectAfterLatexBlock } from '../mathSelection';

export const rinSingleLineDisplayMathInputRule: MilkdownPlugin = (ctx) => async () => {
  await ctx.wait(SchemaReady);
  const displayRule = new InputRule(
    /\$\$([^\n$][^\n]*?)\$\$$/,
    (state, match, start) => {
      const content = match[1]?.trim();
      if (!content) return null;

      const { selection } = state;
      if (!selection.empty) return null;

      const { $from } = selection;
      const parent = $from.parent;
      if (parent.type.name !== 'paragraph') return null;

      const codeBlockType = codeBlockSchema.type(ctx);
      const codeBlock = codeBlockType.create(
        { language: 'LaTeX' },
        state.schema.text(content),
      );
      const blockPos = $from.before($from.depth);
      if (start !== blockPos + 1) return null;
      const tr = state.tr.replaceWith(
        blockPos,
        blockPos + parent.nodeSize,
        codeBlock,
      );
      if (!selectAfterLatexBlock(tr, blockPos + codeBlock.nodeSize)) return null;
      return tr;
    },
  );
  const guardedInlineRule = new InputRule(
    /(?:\$)([^$\n]+)(?:\$)$/,
    (state, match, start, end) => {
      const content = match[1]?.trim();
      if (!content) return null;

      const { selection } = state;
      if (!selection.empty) return null;

      const parentText = selection.$from.parent.textBetween(
        0,
        selection.$from.parent.content.size,
        '\n',
        '\n',
      );
      if (parentText.startsWith('$$')) return null;

      const mathInlineType = state.schema.nodes.math_inline;
      if (!mathInlineType) return null;

      return state.tr.replaceWith(
        start,
        end,
        mathInlineType.create({ value: content }),
      );
    },
  );
  const isCrepeInlineMathRule = (rule: InputRule) => {
    const match = (rule as InputRule & { match?: RegExp }).match;
    return match?.source === '(?:\\$)([^$]+)(?:\\$)$';
  };
  ctx.update(inputRulesCtx, (rules) => [
    displayRule,
    guardedInlineRule,
    ...rules.filter((rule) => !isCrepeInlineMathRule(rule)),
  ]);
  return () => {
    ctx.update(inputRulesCtx, (rules) =>
      rules.filter((item) => item !== displayRule && item !== guardedInlineRule),
    );
  };
};
