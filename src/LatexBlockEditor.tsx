import type { Crepe } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/kit/core';
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import CodeMirrorEditor, {
  type CodeMirrorEditorHandle,
} from './CodeMirrorEditor';
import {
  focusAfterLatexBlock,
  latexBlockNodeInfo,
  updateLatexBlockNode,
  type LatexBlockEditorState,
} from './mathCommands';
import { normalizeLatexBlockEditorValue } from './mathMarkdown';

type UseLatexBlockEditorOptions = {
  editorRef: RefObject<Crepe | null>;
  readOnlyRef: RefObject<boolean>;
  skipNextMathReparseRef: RefObject<boolean>;
  normalizeMarkdown: (markdown: string) => string;
  onCommit: (markdown: string) => void;
};

export function useLatexBlockEditor({
  editorRef,
  readOnlyRef,
  skipNextMathReparseRef,
  normalizeMarkdown,
  onCommit,
}: UseLatexBlockEditorOptions) {
  const activeBlockRef = useRef<HTMLElement | null>(null);
  const editorHandleRef = useRef<CodeMirrorEditorHandle | null>(null);
  const editorStateRef = useRef<LatexBlockEditorState | null>(null);
  const pendingContinuationPosRef = useRef<number | null>(null);
  const normalizeMarkdownRef = useRef(normalizeMarkdown);
  const onCommitRef = useRef(onCommit);
  const [editor, setEditor] = useState<LatexBlockEditorState | null>(null);

  useEffect(() => {
    normalizeMarkdownRef.current = normalizeMarkdown;
    onCommitRef.current = onCommit;
  }, [normalizeMarkdown, onCommit]);

  const closeEditor = useCallback((commit = true, focusAfter = false) => {
    const currentEditor = editorStateRef.current;
    const currentBlock = activeBlockRef.current;
    if (!currentEditor && !currentBlock) return;
    currentBlock?.classList.remove('rin-latex-editing');
    let committed = false;
    if (commit && currentEditor && editorRef.current) {
      skipNextMathReparseRef.current = true;
      const nextValue = normalizeLatexBlockEditorValue(currentEditor.value);
      committed = updateLatexBlockNode(
        editorRef.current,
        currentEditor.pos,
        nextValue,
        focusAfter,
      );
      onCommitRef.current(
        normalizeMarkdownRef.current(editorRef.current.getMarkdown()),
      );
    }
    activeBlockRef.current = null;
    editorHandleRef.current = null;
    editorStateRef.current = null;
    pendingContinuationPosRef.current =
      focusAfter && commit && currentEditor && !committed ? currentEditor.pos : null;
    setEditor(null);
  }, [editorRef, skipNextMathReparseRef]);

  const changeValue = useCallback((nextValue: string) => {
    setEditor((current) => {
      if (!current) return current;
      const next = { ...current, value: nextValue };
      editorStateRef.current = next;
      return next;
    });
  }, []);

  const submitAndContinue = useCallback(() => {
    closeEditor(true, true);
  }, [closeEditor]);

  const showEditor = useCallback((block: HTMLElement, info: LatexBlockEditorState) => {
    if (editorStateRef.current?.pos === info.pos) {
      window.setTimeout(() => editorHandleRef.current?.focusEnd(), 0);
      return true;
    }

    closeEditor();
    if (readOnlyRef.current || !editorRef.current) return false;

    activeBlockRef.current?.classList.remove('rin-latex-editing');
    activeBlockRef.current = block;
    block.classList.add('rin-latex-editing');
    const rect = block.getBoundingClientRect();
    const nextEditor = {
      pos: info.pos,
      value: info.value,
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    };
    editorStateRef.current = nextEditor;
    setEditor(nextEditor);
    return true;
  }, [closeEditor, editorRef, readOnlyRef]);

  const openEditorForBlock = useCallback((block: HTMLElement) => {
    if (readOnlyRef.current || !editorRef.current) return false;
    const info = latexBlockNodeInfo(editorRef.current, block);
    if (!info) return false;
    return showEditor(block, {
      ...info,
      top: 0,
      left: 0,
      width: 0,
    });
  }, [editorRef, readOnlyRef, showEditor]);

  const openEditorAtPos = useCallback((pos: number) => {
    if (readOnlyRef.current || !editorRef.current) return false;
    const target = editorRef.current.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const node = view.state.doc.nodeAt(pos);
      if (
        !node ||
        node.type.name !== 'code_block' ||
        String(node.attrs.language || '').toLowerCase() !== 'latex'
      ) {
        return null;
      }

      const dom = view.nodeDOM(pos);
      const block =
        dom instanceof HTMLElement
          ? dom.closest('.milkdown-code-block')
          : dom?.parentElement?.closest('.milkdown-code-block');
      if (!(block instanceof HTMLElement)) return null;
      return {
        block,
        info: {
          pos,
          value: node.textContent,
          top: 0,
          left: 0,
          width: 0,
        },
      };
    });
    if (!target) return false;
    return showEditor(target.block, target.info);
  }, [editorRef, readOnlyRef, showEditor]);

  const openFocusedEditor = useCallback((host: HTMLElement) => {
    if (editorStateRef.current) return true;
    const focusedBlock = host.querySelector(
      '.rin-latex-block .cm-editor.cm-focused',
    )?.closest('.rin-latex-block');
    if (!(focusedBlock instanceof HTMLElement)) return false;
    return openEditorForBlock(focusedBlock);
  }, [openEditorForBlock]);

  const openEditorFromPointer = useCallback((event: PointerEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const block = target.closest('.rin-latex-block');
    if (!(block instanceof HTMLElement)) return;
    openEditorForBlock(block);
    event.preventDefault();
    event.stopPropagation();
  }, [openEditorForBlock]);

  const openEditorFromFocus = useCallback((event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const block = target.closest('.rin-latex-block');
    if (!(block instanceof HTMLElement)) return;
    openEditorForBlock(block);
  }, [openEditorForBlock]);

  const openEditorFromShortcut = useCallback((event: Event, host: HTMLElement) => {
    if (readOnlyRef.current || !(event instanceof CustomEvent)) return;
    const detail = event.detail as { pos?: unknown } | null;
    const pos = detail?.pos;
    if (typeof pos !== 'number') return;
    window.setTimeout(() => {
      if (openEditorAtPos(pos)) return;
      openFocusedEditor(host);
    }, 0);
  }, [openEditorAtPos, openFocusedEditor, readOnlyRef]);

  useEffect(() => {
    if (!editor) return undefined;

    const closeFromOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        activeBlockRef.current?.contains(target) ||
        (target instanceof Element && target.closest('.rin-latex-editor-panel'))
      ) {
        return;
      }
      closeEditor();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeEditor(false);
    };

    document.addEventListener('mousedown', closeFromOutside, true);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('mousedown', closeFromOutside, true);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [closeEditor, editor]);

  useEffect(() => {
    if (editor) return undefined;
    const pendingPos = pendingContinuationPosRef.current;
    if (pendingPos === null) return undefined;
    pendingContinuationPosRef.current = null;

    let cancelled = false;
    const frameId = window.requestAnimationFrame(() => {
      if (cancelled || !editorRef.current) return;
      focusAfterLatexBlock(editorRef.current, pendingPos);
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [editor, editorRef]);

  return {
    editor,
    editorHandleRef,
    closeEditor,
    changeValue,
    submitAndContinue,
    openEditorAtPos,
    openEditorFromFocus,
    openEditorFromPointer,
    openEditorFromShortcut,
    openFocusedEditor,
  };
}

type LatexBlockEditorPanelProps = {
  editor: LatexBlockEditorState;
  editorHandleRef: RefObject<CodeMirrorEditorHandle | null>;
  ariaLabel?: string;
  doneLabel?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function LatexBlockEditorPanel({
  editor,
  editorHandleRef,
  ariaLabel = '编辑行间公式',
  doneLabel = '完成',
  onChange,
  onSubmit,
}: LatexBlockEditorPanelProps) {
  return (
    <div
      className="rin-latex-editor-panel"
      style={{
        left: `${editor.left}px`,
        top: `${editor.top}px`,
        width: `${editor.width}px`,
      }}
    >
      <span>$$</span>
      <CodeMirrorEditor
        value={editor.value}
        minHeight="86px"
        ariaLabel={ariaLabel}
        editorRef={editorHandleRef}
        submitOnEnter={false}
        onReady={(handle) => {
          editorHandleRef.current = handle;
          handle?.focusEnd();
          window.setTimeout(() => handle?.focusEnd(), 0);
        }}
        onChange={onChange}
        onSubmit={onSubmit}
      />
      <span>$$</span>
      <button className="rin-latex-editor-submit" type="button" onClick={onSubmit}>
        {doneLabel}
      </button>
    </div>
  );
}
