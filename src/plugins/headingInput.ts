import { inputRulesCtx, SchemaReady } from '@milkdown/kit/core';
import type { MilkdownPlugin } from '@milkdown/kit/ctx';
import { headingSchema } from '@milkdown/kit/preset/commonmark';
import { InputRule } from '@milkdown/kit/prose/inputrules';

export type HeadingTitleMode = 'first-block' | 'external';

/** Convert typed body H1 markers to H2. Existing document nodes are untouched. */
export function createHeadingInputRule(titleMode: HeadingTitleMode = 'first-block'): MilkdownPlugin {
  return (ctx) => async () => {
    await ctx.wait(SchemaReady);
    const demoteRule = new InputRule(/^#\s$/, (state, _match, start, end) => {
      const { selection } = state;
      if (!selection.empty) return null;

      const { $from } = selection;
      const parent = $from.parent;
      if ($from.depth <= 0 || parent.type.name !== 'paragraph') return null;

      const blockPos = $from.before($from.depth);
      if ((titleMode === 'first-block' && blockPos <= 0) || start !== blockPos + 1) return null;

      const tr = state.tr.delete(start, end);
      const nextBlockStart = tr.mapping.map(blockPos);
      const nextBlockEnd = tr.mapping.map(blockPos + parent.nodeSize);
      const heading = headingSchema.type(ctx);
      tr.setBlockType(nextBlockStart, nextBlockEnd, heading, { level: 2 });
      return tr;
    });
    ctx.update(inputRulesCtx, (rules) => [demoteRule, ...rules]);
    return () => {
      ctx.update(inputRulesCtx, (rules) => rules.filter((item) => item !== demoteRule));
    };
  };
}

export const rinNonFirstH1InputRule = createHeadingInputRule();
