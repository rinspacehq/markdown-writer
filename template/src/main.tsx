import { type Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import {
  firstMarkdownHeading,
  markdownWithoutDefaultTemplate,
  normalizeMilkdownMathMarkdown,
} from '@rinspacehq/markdown-writer';
import {
  createMathReparseController,
  createWritingInteractions,
  insertLatexBlockInCtx,
} from '@rinspacehq/markdown-writer/interactions';
import {
  LatexBlockEditorPanel,
  useLatexBlockEditor,
} from '@rinspacehq/markdown-writer/latex-editor';
import {
  applyWriterTopBarLabels,
  createWriterEditor,
  syncWriterTitle,
  WriterEditorFrame,
  WriterTitleField,
} from '@rinspacehq/markdown-writer/writer';
import '@rinspacehq/markdown-writer/writer.css';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Crepe | null>(null);
  const markdownRef = useRef('');
  const syncingRef = useRef(false);
  const readOnlyRef = useRef(false);
  const skipNextMathReparseRef = useRef(false);
  const titleRef = useRef('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [editorReady, setEditorReady] = useState(false);
  const {
    editor: latexEditor,
    editorHandleRef: latexEditorHandleRef,
    closeEditor: closeLatexBlockEditor,
    changeValue: changeLatexBlockValue,
    submitAndContinue: submitLatexBlockAndContinue,
    openEditorAtPos: openLatexBlockEditorAtPos,
    openEditorFromFocus: openFocusedLatexBlockEditor,
    openEditorFromPointer: openLatexBlockEditor,
    openEditorFromShortcut,
    openFocusedEditor: openNewFocusedLatexBlockEditor,
  } = useLatexBlockEditor({
    editorRef,
    readOnlyRef,
    skipNextMathReparseRef,
    normalizeMarkdown: normalizeMilkdownMathMarkdown,
    onCommit: (markdown) => { markdownRef.current = markdown; },
  });

  useEffect(() => {
    if (!editorReady || !hostRef.current) return;
    return applyWriterTopBarLabels(hostRef.current, {
      toolbar: 'Markdown editing tools',
      heading: 'Paragraph and heading',
      items: [
        'Bold', 'Italic', 'Strikethrough', 'Inline code', 'Bullet list',
        'Ordered list', 'Task list', 'Link', 'Table', 'Code block',
        'Quote', 'Horizontal rule', 'Math',
      ],
    });
  }, [editorReady]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const reparse = createMathReparseController({ host, editorRef, markdownRef, syncingRef });
    const editor = createWriterEditor({
      root: host,
      defaultValue: '',
      headingOptions: [
        { label: 'Paragraph', level: null },
        ...([2, 3, 4, 5, 6] as const).map((level) => ({ label: `Heading ${level}`, level })),
      ],
      placeholder: false,
      mathLabel: 'Math',
      openMath: (ctx) => {
        closeLatexBlockEditor();
        reparse.clear();
        skipNextMathReparseRef.current = true;
        const pos = insertLatexBlockInCtx(ctx);
        if (pos === false) {
          skipNextMathReparseRef.current = false;
          return;
        }
        window.requestAnimationFrame(() => {
          if (openLatexBlockEditorAtPos(pos)) return;
          window.setTimeout(() => { openLatexBlockEditorAtPos(pos); }, 50);
        });
      },
    });
    const interactions = createWritingInteractions({
      host, editorRef, readOnlyRef, scheduleMathReparse: reparse.schedule,
      openLatexFromPointer: openLatexBlockEditor,
      openLatexFromFocus: openFocusedLatexBlockEditor,
      openLatexFromShortcut: (event) => openEditorFromShortcut(event, host),
      openFocusedLatex: () => openNewFocusedLatexBlockEditor(host),
      inlineMathLabels: {
        ariaLabel: 'Inline math editor', save: 'Done', cancel: 'Cancel',
      },
    });
    editor.on((listener) => listener.markdownUpdated((_ctx, markdown) => {
      const next = normalizeMilkdownMathMarkdown(markdownWithoutDefaultTemplate(markdown));
      markdownRef.current = next;
      if (syncingRef.current) return;
      const headingTitle = firstMarkdownHeading(next);
      if (headingTitle && headingTitle !== titleRef.current) {
        titleRef.current = headingTitle;
        setTitle(headingTitle);
      }
      if (skipNextMathReparseRef.current) {
        skipNextMathReparseRef.current = false;
        reparse.markHandled(next);
        return;
      }
      reparse.schedule(next);
    }));
    editorRef.current = editor;
    void editor.create().then(() => {
      if (disposed) return;
      interactions.attach();
      setEditorReady(true);
    }).catch((reason: unknown) => {
      if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
    });
    return () => {
      disposed = true;
      interactions.destroy();
      reparse.clear();
      closeLatexBlockEditor(false);
      editorRef.current = null;
      void editor.destroy();
    };
  }, []);

  const changeTitle = (value: string) => {
    closeLatexBlockEditor();
    titleRef.current = value;
    setTitle(value);
    if (editorReady) syncWriterTitle({ editor: editorRef.current, markdownRef, syncingRef, title: value });
  };

  return (
    <div className="rin-writer-demo" data-rin-ui="v2">
      <div className="rin-app-frame">
        <main className="writer-shell markdown-writer-shell">
          <div className="writer-publish-bar markdown-writer-publish-bar">
            <WriterTitleField title={title} label="Article title" onTitleChange={changeTitle} />
          </div>
          <WriterEditorFrame
            hostRef={hostRef}
            label="Markdown editor"
            enterFullscreenLabel="Enter fullscreen editor"
            exitFullscreenLabel="Exit fullscreen editor"
            loading={editorReady ? null : <div role="status">Loading editor…</div>}
          />
          {latexEditor ? (
            <LatexBlockEditorPanel
              editor={latexEditor}
              editorHandleRef={latexEditorHandleRef}
              ariaLabel="Edit LaTeX formula"
              doneLabel="Done"
              onChange={changeLatexBlockValue}
              onSubmit={submitLatexBlockAndContinue}
            />
          ) : null}
          {error && <p role="alert">{error}</p>}
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
