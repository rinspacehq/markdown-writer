import { Crepe, type CrepeConfig } from '@milkdown/crepe';
import { commandsCtx } from '@milkdown/kit/core';
import type { Ctx } from '@milkdown/kit/ctx';
import { codeBlockSchema, setBlockTypeCommand } from '@milkdown/kit/preset/commonmark';
import { replaceAll } from '@milkdown/kit/utils';
import { useEffect, useState, type ChangeEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import { rinTopBarMathIcon } from './mathView';
import { registerWritingEnhancements } from './preset';
import { markdownWithTitle } from './markdownTitle';
import './writer.css';

export type WriterTopBarGroup = {
  addItem: (key: string, item: {
    icon: string;
    active: (ctx: Ctx) => boolean;
    onRun: (ctx: Ctx) => void;
  }) => WriterTopBarGroup;
  clear: () => WriterTopBarGroup;
};

export type WriterTopBarBuilder = {
  addGroup: (key: string, label: string) => WriterTopBarGroup;
  getGroup: (key: string) => WriterTopBarGroup;
};

const writerQuiverIcon = `
  <span class="milkdown-icon">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="6" cy="6" r="1.7"></circle>
        <circle cx="18" cy="6" r="1.7"></circle>
        <circle cx="6" cy="18" r="1.7"></circle>
        <circle cx="18" cy="18" r="1.7"></circle>
        <path d="M8.2 6h7.1"></path><path d="M15.1 4.4 17 6l-1.9 1.6"></path>
        <path d="M6 8.2v7.1"></path><path d="M4.4 15.1 6 17l1.6-1.9"></path>
        <path d="M8.2 18h7.1"></path><path d="M15.1 16.4 17 18l-1.9 1.6"></path>
      </g>
    </svg>
  </span>
`;

export function appendWriterQuiverTopBar(
  builder: WriterTopBarBuilder,
  openQuiver: () => void,
  label = 'Quiver',
) {
  builder.addGroup('rin-quiver', label).addItem('quiver', {
    icon: writerQuiverIcon,
    active: () => false,
    onRun: openQuiver,
  });
}

export type WriterHeadingOption = { label: string; level: number | null };

export type CreateWriterEditorOptions = {
  root: HTMLElement;
  defaultValue: string;
  headingOptions: WriterHeadingOption[];
  placeholder?: string | false;
  openMath: (ctx: Ctx) => void;
  mathLabel?: string;
  /** Private hosts can add their own controls without forking the editor configuration. */
  extendTopBar?: (builder: WriterTopBarBuilder) => void;
  uploadImage?: (file: File) => Promise<string>;
  imageCaptionPlaceholder?: string;
  imageUploadPlaceholder?: string;
  mathTrust?: boolean;
};

export function createWriterEditor({
  root, defaultValue, headingOptions, placeholder = false, openMath,
  mathLabel, extendTopBar, uploadImage, imageCaptionPlaceholder,
  imageUploadPlaceholder, mathTrust = false,
}: CreateWriterEditorOptions) {
  const featureConfigs: NonNullable<CrepeConfig['featureConfigs']> = {
    [Crepe.Feature.TopBar]: {
      headingOptions,
      mathIcon: rinTopBarMathIcon,
      buildTopBar: (builder) => {
        const topBar = builder as WriterTopBarBuilder;
        topBar.getGroup('block').clear().addItem('code-block', {
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 2v14h16V5H4zm8 10h6v2h-6v-2zm-3.333-3L5.838 9.172l1.415-1.415L11.495 12l-4.242 4.243-1.415-1.415L8.667 12z"/></svg>',
          active: () => false,
          onRun: (ctx) => {
            const commands = ctx.get(commandsCtx);
            const codeBlock = codeBlockSchema.type(ctx);
            commands.call(setBlockTypeCommand.key, { nodeType: codeBlock });
          },
        });
        topBar.addGroup('rin-math', mathLabel || 'Math').addItem('math', {
          icon: rinTopBarMathIcon,
          active: () => false,
          onRun: openMath,
        });
        extendTopBar?.(topBar);
      },
    },
    [Crepe.Feature.BlockEdit]: {
      textGroup: { h1: null },
      advancedGroup: { math: null },
    },
    [Crepe.Feature.Latex]: {
      katexOptions: { throwOnError: false, strict: false, trust: mathTrust },
    },
  };
  if (uploadImage) {
    featureConfigs[Crepe.Feature.ImageBlock] = {
      onUpload: uploadImage,
      blockCaptionPlaceholderText: imageCaptionPlaceholder || '',
      blockUploadPlaceholderText: imageUploadPlaceholder || '',
    };
  }
  if (placeholder !== false) {
    featureConfigs[Crepe.Feature.Placeholder] = { text: placeholder, mode: 'block' };
  }

  const editor = new Crepe({
    root, defaultValue,
    features: {
      [Crepe.Feature.CodeMirror]: true,
      [Crepe.Feature.Latex]: true,
      [Crepe.Feature.Toolbar]: true,
      [Crepe.Feature.BlockEdit]: true,
      [Crepe.Feature.TopBar]: true,
      [Crepe.Feature.Table]: true,
      [Crepe.Feature.ImageBlock]: Boolean(uploadImage),
      [Crepe.Feature.LinkTooltip]: true,
      [Crepe.Feature.Placeholder]: placeholder !== false,
    },
    featureConfigs,
  });
  registerWritingEnhancements(editor, { titleMode: 'first-block' });
  return editor;
}

export function syncWriterTitle({
  editor, markdownRef, syncingRef, title,
}: {
  editor: Crepe | null;
  markdownRef: { current: string };
  syncingRef: { current: boolean };
  title: string;
}) {
  if (!editor) return;
  const nextMarkdown = markdownWithTitle(markdownRef.current, title);
  if (nextMarkdown === markdownRef.current) return;
  syncingRef.current = true;
  markdownRef.current = nextMarkdown;
  editor.editor.action(replaceAll(nextMarkdown, true));
  window.setTimeout(() => { syncingRef.current = false; }, 0);
}

export type WriterTopBarLabels = {
  toolbar: string;
  heading: string;
  items: readonly string[];
};

/** Applies the same accessible names to Crepe's toolbar in both hosts. */
export function applyWriterTopBarLabels(host: HTMLElement, labels: WriterTopBarLabels) {
  const synchronize = () => {
    const toolbar = host.querySelector<HTMLElement>('.top-bar-inner');
    toolbar?.setAttribute('role', 'toolbar');
    toolbar?.setAttribute('aria-label', labels.toolbar);
    const labelControl = (control: HTMLButtonElement, label: string) => {
      control.setAttribute('aria-label', label);
      control.setAttribute('data-rin-tooltip', label);
    };
    const heading = host.querySelector<HTMLButtonElement>('.top-bar-heading-button');
    if (heading) labelControl(heading, labels.heading);
    const items = host.querySelectorAll<HTMLButtonElement>('.top-bar-item');
    items.forEach((button, index) => {
      const label = labels.items[index];
      if (label) labelControl(button, label);
    });
  };
  synchronize();
  const observer = new MutationObserver(synchronize);
  observer.observe(host, { childList: true, subtree: true });
  return () => observer.disconnect();
}

export type WriterTitleFieldProps = {
  title: string;
  label: string;
  onTitleChange: (title: string) => void;
};

/** The same title field is rendered by the public page and rinspace.com. */
export function WriterTitleField({ title, label, onTitleChange }: WriterTitleFieldProps) {
  const change = (event: ChangeEvent<HTMLInputElement>) => onTitleChange(event.currentTarget.value);
  return (
    <div className="rin-ui-field writer-title-field">
      <label htmlFor="markdown-title" className="rin-compat-label">{label}</label>
      <input id="markdown-title" className="rin-ui-control" value={title} onChange={change} />
    </div>
  );
}

export type WriterEditorFrameProps = {
  hostRef: RefObject<HTMLDivElement | null>;
  label: string;
  enterFullscreenLabel: string;
  exitFullscreenLabel: string;
  ready: boolean;
  loading?: ReactNode;
};

/** Owns the production frame, fullscreen behavior, and Milkdown mount element. */
export function WriterEditorFrame({
  hostRef, label, enterFullscreenLabel, exitFullscreenLabel, ready, loading,
}: WriterEditorFrameProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [toolbar, setToolbar] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!ready) {
      setToolbar(null);
      setFullscreen(false);
      return undefined;
    }
    const host = hostRef.current;
    if (!host) return undefined;
    const synchronize = () => {
      setToolbar(host.querySelector<HTMLElement>('.top-bar-inner'));
    };
    synchronize();
    const observer = new MutationObserver(synchronize);
    observer.observe(host, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [hostRef, ready]);
  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [fullscreen]);
  const controlLabel = fullscreen ? exitFullscreenLabel : enterFullscreenLabel;
  return (
    <section
      className={`writer-frame markdown-writer-frame${fullscreen ? ' is-fullscreen' : ''}`}
      aria-label={label}
      data-editor-fullscreen={fullscreen ? 'true' : 'false'}
    >
      {loading}
      <div ref={hostRef} className="milkdown-editor-host" />
      {toolbar ? createPortal(
        <button
          className="top-bar-item rin-animate-icon-button markdown-editor-fullscreen-toggle"
          type="button"
          aria-label={controlLabel}
          title={controlLabel}
          data-rin-tooltip={controlLabel}
          aria-pressed={fullscreen}
          onClick={() => setFullscreen((current) => !current)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            {fullscreen ? (
              <><path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="m14 10 7-7" /><path d="m3 21 7-7" /></>
            ) : (
              <><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></>
            )}
          </svg>
        </button>,
        toolbar,
      ) : null}
    </section>
  );
}
