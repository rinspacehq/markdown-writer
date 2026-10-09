import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import {
  MarkdownWriterPage,
  type MarkdownWriterLabels,
  type MarkdownWriterPageLabels,
} from '@rinspacehq/markdown-writer/page';
import '@rinspacehq/markdown-writer/writer.css';
import { useEffect, useRef, useState } from 'react';
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
  const imageObjectUrlsRef = useRef(new Set<string>());
  const pendingImageObjectUrlsRef = useRef(new Set<string>());

  const revokeObjectUrl = (url: string) => {
    if (!url.startsWith('blob:')) return;
    URL.revokeObjectURL(url);
    imageObjectUrlsRef.current.delete(url);
    pendingImageObjectUrlsRef.current.delete(url);
  };

  const createImageObjectUrl = (file: File) => {
    const url = URL.createObjectURL(file);
    imageObjectUrlsRef.current.add(url);
    pendingImageObjectUrlsRef.current.add(url);
    return url;
  };

  useEffect(() => () => {
    imageObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    imageObjectUrlsRef.current.clear();
    pendingImageObjectUrlsRef.current.clear();
  }, []);

  const selectCover = (file: File) => {
    setCoverUrl((current) => {
      revokeObjectUrl(current);
      return createImageObjectUrl(file);
    });
  };

  const removeCover = () => {
    setCoverUrl((current) => {
      revokeObjectUrl(current);
      return '';
    });
  };

  const releaseRemovedImages = (markdown: string) => {
    pendingImageObjectUrlsRef.current.forEach((url) => {
      if (markdown.includes(url)) pendingImageObjectUrlsRef.current.delete(url);
    });
    imageObjectUrlsRef.current.forEach((url) => {
      if (
        url !== coverUrl &&
        !pendingImageObjectUrlsRef.current.has(url) &&
        !markdown.includes(url)
      ) {
        revokeObjectUrl(url);
      }
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
          onMarkdownChange={releaseRemovedImages}
          controls={{
            tags,
            onTagsChange: setTags,
            coverUrl,
            onCoverFile: selectCover,
            onRemoveCover: removeCover,
            sourceVisibility,
            onSourceVisibilityChange: setSourceVisibility,
            onOpenSummary: () => undefined,
            onSaveDraft: () => undefined,
            onPublish: () => undefined,
            canSave: Boolean(title.trim()),
          }}
          editorOptions={{
            uploadImage: async (file) => createImageObjectUrl(file),
            imageCaptionPlaceholder: '添加图片说明',
            imageUploadPlaceholder: '上传图片',
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
