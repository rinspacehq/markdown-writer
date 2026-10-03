import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import {
  MarkdownWriterPage,
  type MarkdownWriterLabels,
  type MarkdownWriterPageLabels,
} from '@rinspacehq/markdown-writer/page';
import '@rinspacehq/markdown-writer/writer.css';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

const labels: MarkdownWriterLabels = {
  title: '文章标题',
  editor: 'Markdown editor',
  enterFullscreen: '全屏编辑',
  exitFullscreen: '退出全屏',
  mathBlockEditor: '编辑 LaTeX 公式',
  done: '完成',
  math: '数学公式',
  headings: [
    { label: '正文', level: null },
    ...([2, 3, 4, 5, 6] as const).map((level) => ({
      label: `${level} 级标题`,
      level,
    })),
  ],
  topBar: {
    toolbar: 'Markdown 编辑工具',
    heading: '正文与标题',
    items: [
      '粗体', '斜体', '删除线', '行内代码', '无序列表',
      '有序列表', '任务列表', '链接', '图片', '表格', '代码块',
      '引用', '分割线', '数学公式', 'Quiver',
    ],
  },
  inlineMath: {
    ariaLabel: '行内数学公式编辑器',
    save: '完成',
    cancel: '取消',
  },
};

const pageLabels: MarkdownWriterPageLabels = {
  tags: '标签',
  summary: '摘要',
  cover: '封面',
  uploadCover: '上传',
  changeCover: '更换',
  removeCover: '移除',
  source: '源码',
  saveState: '保存状态',
  sourceVisibility: '源码可见性',
  openSource: '开放',
  privateSource: '私有',
  saveDraft: '存草稿',
  publish: '发布',
  saving: '保存中',
  publishing: '发布中',
};

function App() {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [sourceVisibility, setSourceVisibility] = useState<'open' | 'private'>('open');
  const [error, setError] = useState('');

  const selectCover = (file: File) => {
    setCoverUrl((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  return (
    <div className="rin-writer-demo" data-rin-ui="v2">
      <div className="rin-app-frame">
        <MarkdownWriterPage
          title={title}
          initialMarkdown=""
          labels={labels}
          pageLabels={pageLabels}
          onTitleChange={setTitle}
          controls={{
            tags,
            onTagsChange: setTags,
            coverUrl,
            onCoverFile: selectCover,
            onRemoveCover: () => setCoverUrl(''),
            sourceVisibility,
            onSourceVisibilityChange: setSourceVisibility,
            onOpenSummary: () => undefined,
            onSaveDraft: () => undefined,
            onPublish: () => undefined,
            canSave: Boolean(title.trim()),
          }}
          editorOptions={{
            uploadImage: async (file) => URL.createObjectURL(file),
            imageCaptionPlaceholder: '添加图片说明',
            imageUploadPlaceholder: '上传图片',
            mathTrust: true,
          }}
          quiver={{ label: 'Quiver', onOpen: () => undefined }}
          onError={(reason) => {
            setError(reason instanceof Error ? reason.message : String(reason));
          }}
          loading={<div role="status">正在加载编辑器…</div>}
        />
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
