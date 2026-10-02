import { Plugin, PluginKey, TextSelection } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';
import { $prose } from '@milkdown/kit/utils';
import { rinLatexBlockOpenEvent, type RinLatexBlockOpenRequest } from '../mathEvents';
import { selectAfterLatexBlock } from '../mathSelection';

const rinDisplayMathShortcutKey = new PluginKey<RinLatexBlockOpenRequest | null>(
  'rin-display-math-shortcut',
);

let nextLatexBlockOpenRequestId = 0;

function replaceCurrentParagraphWithLatexBlock(
  view: EditorView,
  value: string,
  openEditor: boolean,
) {
  const { state } = view;
  const { selection } = state;
  if (!selection.empty) return false;

  const { $from } = selection;
  const parent = $from.parent;
  if ($from.depth <= 0 || parent.type.name !== 'paragraph') return false;

  const codeBlockType = state.schema.nodes.code_block;
  if (!codeBlockType) return false;

  const codeBlock = codeBlockType.create(
    { language: 'LaTeX' },
    value ? state.schema.text(value) : null,
  );
  const blockPos = $from.before($from.depth);
  const tr = state.tr.replaceWith(
    blockPos,
    blockPos + parent.nodeSize,
    codeBlock,
  );

  if (openEditor) {
    tr.setSelection(TextSelection.create(tr.doc, blockPos + 1));
    tr.setMeta(rinDisplayMathShortcutKey, {
      requestId: nextLatexBlockOpenRequestId + 1,
      pos: blockPos,
    } satisfies RinLatexBlockOpenRequest);
    nextLatexBlockOpenRequestId += 1;
  } else if (!selectAfterLatexBlock(tr, blockPos + codeBlock.nodeSize)) {
    return false;
  }

  view.dispatch(tr.scrollIntoView());
  view.focus();
  return true;
}

function activeParagraphTextAroundSelection(view: EditorView) {
  const { selection } = view.state;
  if (!selection.empty) return null;

  const { $from } = selection;
  const parent = $from.parent;
  if (parent.type.name !== 'paragraph') return null;

  return {
    before: parent.textBetween(0, $from.parentOffset, '\n', '\n'),
    after: parent.textBetween($from.parentOffset, parent.content.size, '\n', '\n'),
  };
}

function isDisplayMathFenceKey(event: KeyboardEvent) {
  if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return false;
  }
  return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
}

export const rinDisplayMathShortcutPlugin = $prose(() => {
  return new Plugin<RinLatexBlockOpenRequest | null>({
    key: rinDisplayMathShortcutKey,
    state: {
      init: () => null,
      apply: (tr, previous) => {
        const request = tr.getMeta(rinDisplayMathShortcutKey) as
          | RinLatexBlockOpenRequest
          | undefined;
        return request || previous;
      },
    },
    props: {
      handleTextInput: (view, _from, _to, text) => {
        if (text !== '$') return false;
        const around = activeParagraphTextAroundSelection(view);
        if (!around || around.before !== '$$$' || around.after !== '') return false;
        return replaceCurrentParagraphWithLatexBlock(view, '', true);
      },
      handleKeyDown: (view, event) => {
        if (!isDisplayMathFenceKey(event)) return false;
        const around = activeParagraphTextAroundSelection(view);
        if (!around || around.before !== '$$' || around.after !== '') return false;
        event.preventDefault();
        return replaceCurrentParagraphWithLatexBlock(view, '', true);
      },
    },
    view: () => {
      let lastRequestId = 0;
      return {
        update: (currentView) => {
          const request = rinDisplayMathShortcutKey.getState(currentView.state);
          if (!request || request.requestId === lastRequestId) return;
          lastRequestId = request.requestId;
          currentView.dom.dispatchEvent(
            new CustomEvent<RinLatexBlockOpenRequest>(rinLatexBlockOpenEvent, {
              bubbles: true,
              detail: request,
            }),
          );
        },
        destroy: () => {
          lastRequestId = 0;
        },
      };
    },
  });
});
