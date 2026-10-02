import type { Crepe } from '@milkdown/crepe';

import { rinDisplayMathShortcutPlugin } from './plugins/displayMathShortcut';
import { createHeadingInputRule, type HeadingTitleMode } from './plugins/headingInput';
import { rinLatexCodeBlockGapCursorPlugin } from './plugins/latexGapCursor';
import { rinLatexTrailingConfigPlugin } from './plugins/latexTrailingConfig';
import { rinLatexTrailingPlaceholderPlugin } from './plugins/latexTrailingPlaceholder';
import { rinSingleLineDisplayMathInputRule } from './plugins/singleLineDisplayMath';
import { rinTypedDisplayMathFenceMergePlugin } from './plugins/typedDisplayMathFenceMerge';
import { rinTypedMarkdownTableInputPlugin } from './plugins/typedMarkdownTable';

export type WritingEnhancementOptions = {
  /** Use external when the title is held in a field above the editor. */
  titleMode?: HeadingTitleMode;
};

/** Register the eight writing plugins in their validated order. */
export function registerWritingEnhancements(
  crepe: Crepe,
  { titleMode = 'first-block' }: WritingEnhancementOptions = {},
) {
  crepe.editor.use(createHeadingInputRule(titleMode));
  crepe.editor.use(rinLatexCodeBlockGapCursorPlugin);
  crepe.editor.use(rinLatexTrailingConfigPlugin);
  crepe.editor.use(rinLatexTrailingPlaceholderPlugin);
  crepe.editor.use(rinTypedDisplayMathFenceMergePlugin);
  crepe.editor.use(rinTypedMarkdownTableInputPlugin);
  crepe.editor.use(rinDisplayMathShortcutPlugin);
  crepe.editor.use(rinSingleLineDisplayMathInputRule);
}
