import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import { MarkdownWriter, type MarkdownWriterLabels } from '@rinspacehq/markdown-writer/page';
import '@rinspacehq/markdown-writer/writer.css';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

const labels: MarkdownWriterLabels = {
  title: 'Article title',
  editor: 'Markdown editor',
  enterFullscreen: 'Enter fullscreen editor',
  exitFullscreen: 'Exit fullscreen editor',
  mathBlockEditor: 'Edit LaTeX formula',
  done: 'Done',
  math: 'Math',
  headings: [
    { label: 'Paragraph', level: null },
    ...([2, 3, 4, 5, 6] as const).map((level) => ({
      label: `Heading ${level}`,
      level,
    })),
  ],
  topBar: {
    toolbar: 'Markdown editing tools',
    heading: 'Paragraph and heading',
    items: [
      'Bold', 'Italic', 'Strikethrough', 'Inline code', 'Bullet list',
      'Ordered list', 'Task list', 'Link', 'Table', 'Code block',
      'Quote', 'Horizontal rule', 'Math',
    ],
  },
  inlineMath: {
    ariaLabel: 'Inline math editor',
    save: 'Done',
    cancel: 'Cancel',
  },
};

function App() {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="rin-writer-demo" data-rin-ui="v2">
      <div className="rin-app-frame">
        <MarkdownWriter
          title={title}
          initialMarkdown=""
          labels={labels}
          onTitleChange={setTitle}
          onError={(reason) => {
            setError(reason instanceof Error ? reason.message : String(reason));
          }}
          loading={<div role="status">Loading editor…</div>}
        />
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
