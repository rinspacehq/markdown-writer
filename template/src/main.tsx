import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import { replaceAll } from '@milkdown/kit/utils';
import {
  joinTitleMarkdown,
  markdownMathForMilkdown,
  normalizeMilkdownMathMarkdown,
  registerWritingEnhancements,
  splitTitleMarkdown,
} from '@rinspacehq/milkdown-writing-preset';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import './style.css';

const initialBody = 'Write Markdown here. Try $x^2$, $$x^2+y^2$$, or a table.\n';

function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Crepe | null>(null);
  const [title, setTitle] = useState('Untitled document');
  const [body, setBody] = useState(initialBody);
  const [source, setSource] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const crepe = new Crepe({
      root: host,
      defaultValue: initialBody,
      features: {
        [Crepe.Feature.Latex]: true,
        [Crepe.Feature.CodeMirror]: true,
        [Crepe.Feature.Table]: true,
      },
      featureConfigs: {
        [Crepe.Feature.Latex]: {
          katexOptions: { throwOnError: false, strict: false, trust: false },
        },
      },
    });
    registerWritingEnhancements(crepe, { titleMode: 'external' });
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => setBody(normalizeMilkdownMathMarkdown(markdown)));
    });
    editorRef.current = crepe;
    void crepe.create().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason));
    });
    return () => {
      editorRef.current = null;
      void crepe.destroy();
    };
  }, []);

  const exportMarkdown = () => {
    const markdown = joinTitleMarkdown(title, editorRef.current?.getMarkdown() ?? body);
    setSource(markdown);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'document.md';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const importMarkdown = () => {
    const parsed = splitTitleMarkdown(source);
    setTitle(parsed.title);
    setBody(parsed.body);
    editorRef.current?.editor.action(replaceAll(markdownMathForMilkdown(parsed.body), true));
  };

  return (
    <main>
      <label className="title-label" htmlFor="document-title">Title</label>
      <input id="document-title" value={title} onChange={(event) => setTitle(event.target.value)} />
      <div className="editor" ref={hostRef} aria-label="Markdown editor" />
      <p className="tip">Try <code># Section</code> in the body, <code>$$x^2$$</code> on a new line, or a pipe table followed by a blank line.</p>
      {error && <p role="alert">Editor failed to load: {error}</p>}
      <section className="markdown-tools" aria-label="Markdown import and export">
        <label htmlFor="markdown-source">Markdown source</label>
        <textarea id="markdown-source" value={source} onChange={(event) => setSource(event.target.value)} />
        <div className="actions">
          <button type="button" onClick={importMarkdown}>Import Markdown</button>
          <button type="button" onClick={exportMarkdown}>Export Markdown</button>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
