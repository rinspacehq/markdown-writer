import { Crepe, type CrepeConfig } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import { editorViewCtx } from '@milkdown/kit/core';
import {
  normalizeLatexBlockEditorValue, normalizeMilkdownMathMarkdown, registerWritingEnhancements,
} from '@rinspacehq/milkdown-writing-preset';
import {
  createMathReparseController, createWritingInteractions, insertLatexBlockInCtx,
  latexBlockNodeInfo, updateLatexBlockNode,
} from '@rinspacehq/milkdown-writing-preset/interactions';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const initialBody = '';
type MathDraft = { pos: number; value: string };

function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Crepe | null>(null);
  const markdownRef = useRef(initialBody);
  const syncingRef = useRef(false);
  const readOnlyRef = useRef(false);
  const [title, setTitle] = useState('Untitled document');
  const [math, setMath] = useState<MathDraft | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const featureConfigs: NonNullable<CrepeConfig['featureConfigs']> = {
      [Crepe.Feature.BlockEdit]: { textGroup: { h1: null }, advancedGroup: { math: null } },
      [Crepe.Feature.Latex]: { katexOptions: { throwOnError: false, strict: false, trust: false } },
      [Crepe.Feature.TopBar]: {
        buildTopBar: (builder) => {
          const mathItem = builder.getGroup('block').group.items.find((item) => item.key === 'math');
          if (mathItem) {
            mathItem.onRun = (ctx) => {
              const pos = insertLatexBlockInCtx(ctx);
              if (typeof pos === 'number') setMath({ pos, value: '' });
            };
          }
        },
      },
      [Crepe.Feature.Placeholder]: { text: 'Start writing Markdown…', mode: 'block' },
    };
    const crepe = new Crepe({
      root: host,
      defaultValue: initialBody,
      features: {
        [Crepe.Feature.CodeMirror]: true, [Crepe.Feature.Latex]: true,
        [Crepe.Feature.Toolbar]: true, [Crepe.Feature.BlockEdit]: true,
        [Crepe.Feature.TopBar]: true, [Crepe.Feature.Table]: true,
        [Crepe.Feature.LinkTooltip]: true, [Crepe.Feature.Placeholder]: true,
        [Crepe.Feature.ImageBlock]: false,
      },
      featureConfigs,
    });
    // The title is a separate document field, so body H1 shortcuts become H2.
    registerWritingEnhancements(crepe, { titleMode: 'external' });
    const reparse = createMathReparseController({ host, editorRef, markdownRef, syncingRef });
    const openMathAt = (pos: number) => {
      const draft = crepe.editor.action((ctx) => {
        const node = ctx.get(editorViewCtx).state.doc.nodeAt(pos);
        return node?.type.name === 'code_block' && String(node.attrs.language).toLowerCase() === 'latex'
          ? { pos, value: node.textContent } : null;
      });
      if (draft) setMath(draft);
      return Boolean(draft);
    };
    const openMathBlock = (block: HTMLElement) => {
      const info = latexBlockNodeInfo(crepe, block);
      if (info) setMath(info);
    };
    const interactions = createWritingInteractions({
      host, editorRef, readOnlyRef, scheduleMathReparse: reparse.schedule,
      openLatexFromPointer: (event) => {
        const block = event.target instanceof Element ? event.target.closest('.rin-latex-block') : null;
        if (!(block instanceof HTMLElement)) return;
        event.preventDefault();
        openMathBlock(block);
      },
      openLatexFromFocus: (event) => {
        const block = event.target instanceof Element ? event.target.closest('.rin-latex-block') : null;
        if (block instanceof HTMLElement) openMathBlock(block);
      },
      openLatexFromShortcut: (event) => {
        if (!(event instanceof CustomEvent) || typeof event.detail?.pos !== 'number') return;
        window.setTimeout(() => openMathAt(event.detail.pos), 0);
      },
      openFocusedLatex: () => {
        const block = host.querySelector('.rin-latex-block .cm-focused')?.closest('.rin-latex-block');
        if (!(block instanceof HTMLElement)) return false;
        openMathBlock(block);
        return true;
      },
    });
    crepe.on((listener) => listener.markdownUpdated((_ctx, markdown) => {
      const next = normalizeMilkdownMathMarkdown(markdown);
      markdownRef.current = next;
      if (!syncingRef.current) reparse.schedule(next);
    }));
    editorRef.current = crepe;
    void crepe.create().then(() => { if (!disposed) interactions.attach(); })
      .catch((reason: unknown) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      disposed = true;
      interactions.destroy();
      reparse.clear();
      editorRef.current = null;
      void crepe.destroy();
    };
  }, []);

  const saveMath = () => {
    const editor = editorRef.current;
    if (!editor || !math) return;
    if (!updateLatexBlockNode(editor, math.pos, normalizeLatexBlockEditorValue(math.value), true)) {
      setError('The formula moved. Reopen it to save your changes.');
      return;
    }
    setMath(null);
    setError('');
  };
  return (
    <main>
      <header className="document-header">
        <label className="visually-hidden" htmlFor="document-title">Title</label>
        <input id="document-title" value={title} onChange={(event) => setTitle(event.target.value)} />
      </header>
      <div className="editor" ref={hostRef} aria-label="Markdown editor" />
      {math && (
        <section className="math-panel" aria-label="Edit LaTeX formula">
          <label htmlFor="math-source">LaTeX formula</label>
          <textarea id="math-source" value={math.value} onChange={(event) => setMath({ ...math, value: event.target.value })} />
          <div className="actions"><button type="button" onClick={saveMath}>Save formula</button><button type="button" className="secondary" onClick={() => setMath(null)}>Cancel</button></div>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
