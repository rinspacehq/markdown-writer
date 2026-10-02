import type { Crepe } from '@milkdown/crepe';
import { replaceAll } from '@milkdown/kit/utils';
import type { RefCell } from './ref';

import { hasCompleteDisplayMathFence } from './mathMarkdown';

type CreateMathReparseControllerOptions = {
  host: HTMLElement;
  editorRef: RefCell<Crepe | null>;
  markdownRef: RefCell<string>;
  syncingRef: RefCell<boolean>;
};

/** Coordinate delayed reparsing without replacing content while the user is editing. */
export function createMathReparseController({
  host,
  editorRef,
  markdownRef,
  syncingRef,
}: CreateMathReparseControllerOptions) {
  let timer: number | null = null;
  let lastSource = '';

  const clear = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  };

  const hasActiveSelection = () => {
    const activeElement = document.activeElement;
    const selection = window.getSelection();
    const anchor = selection?.anchorNode;
    const anchorElement = anchor instanceof Element ? anchor : anchor?.parentElement;
    return Boolean(
      (activeElement instanceof Element && host.contains(activeElement)) ||
        (anchorElement && host.contains(anchorElement)),
    );
  };

  const replaceAllWhenInactive = (markdown: string) => {
    if (hasActiveSelection() || !editorRef.current) return false;
    editorRef.current.editor.action(replaceAll(markdown, true));
    return true;
  };

  const hasStaleMathDom = () =>
    Boolean(
      host.querySelector('.milkdown-code-block .katex-error') ||
        Array.from(host.querySelectorAll('.milkdown-code-block .preview')).some((node) =>
          (node.textContent || '').includes('$$') ||
          (node.textContent || '').includes('\\]'),
        ) ||
        Array.from(host.querySelectorAll('.ProseMirror p')).some((node) =>
          hasCompleteDisplayMathFence(node.textContent || ''),
        ),
    );

  const schedule = (source: string) => {
    if (!hasCompleteDisplayMathFence(source) || lastSource === source) return;
    if (!hasStaleMathDom()) return;
    clear();
    timer = window.setTimeout(() => {
      if (!editorRef.current || markdownRef.current !== source) return;
      if (!hasStaleMathDom() || hasActiveSelection()) return;
      lastSource = source;
      syncingRef.current = true;
      replaceAllWhenInactive(source);
      window.setTimeout(() => {
        syncingRef.current = false;
      }, 0);
    }, 250);
  };

  const markHandled = (source: string) => {
    lastSource = source;
  };

  return {
    clear,
    hasActiveSelection,
    markHandled,
    replaceAllWhenInactive,
    schedule,
  };
}
