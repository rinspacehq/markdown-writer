import { schemaCtx, SchemaReady } from '@milkdown/kit/core';
import type { MilkdownPlugin } from '@milkdown/kit/ctx';

export const rinLatexCodeBlockGapCursorPlugin: MilkdownPlugin = (ctx) => async () => {
  await ctx.wait(SchemaReady);
  const schema = ctx.get(schemaCtx);
  const codeBlock = schema.nodes.code_block;
  if (!codeBlock) return;
  codeBlock.spec.createGapCursor = true;
};
