import {
  forwardRef,
  type ChangeEvent,
  type ReactNode,
} from 'react';

import {
  MarkdownWriter,
  type MarkdownWriterHandle,
  type MarkdownWriterProps,
} from './MarkdownWriter';
import { appendWriterQuiverTopBar } from './writer';

export type MarkdownWriterPageLabels = {
  tags: string;
  summary: string;
  cover: string;
  uploadCover: string;
  changeCover: string;
  removeCover: string;
  source: string;
  saveState: string;
  sourceVisibility: string;
  openSource: string;
  privateSource: string;
  saveDraft: string;
  publish: string;
  saving: string;
  publishing: string;
};

export type MarkdownWriterPageControls = {
  tags?: string;
  onTagsChange?: (value: string) => void;
  renderTagsControl?: (options: {
    id: string;
    label: string;
    disabled: boolean;
  }) => ReactNode;
  summaryCustomized?: boolean;
  onOpenSummary?: () => void;
  coverUrl?: string;
  onCoverFile?: (file: File) => void;
  onRemoveCover?: () => void;
  sourceVisibility?: 'open' | 'private';
  onSourceVisibilityChange?: (visibility: 'open' | 'private') => void;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  disabled?: boolean;
  tagsDisabled?: boolean;
  summaryDisabled?: boolean;
  coverDisabled?: boolean;
  sourceDisabled?: boolean;
  coverBusy?: boolean;
  canSave?: boolean;
  savingMode?: 'draft' | 'published' | '';
};

export type MarkdownWriterPageProps = Omit<
  MarkdownWriterProps,
  'toolbarAfterTitle' | 'afterEditor'
> & {
  pageLabels: MarkdownWriterPageLabels;
  controls?: MarkdownWriterPageControls;
  dialogs?: ReactNode;
  quiver?: {
    label: string;
    onOpen: () => void;
  };
};

function SummaryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 5h16M4 10h16M4 15h10M4 19h7" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m4 17 5-5 4 4 2-2 5 5" />
    </svg>
  );
}

/**
 * The complete page surface shared by the public demo and rinspace.com.
 * Product services enter through values and callbacks; the rendered page stays here.
 */
export const MarkdownWriterPage = forwardRef<MarkdownWriterHandle, MarkdownWriterPageProps>(
  function MarkdownWriterPage(props, forwardedRef) {
    const {
      pageLabels,
      controls = {},
      dialogs,
      quiver,
      editorOptions,
      ...writerProps
    } = props;
    const disabled = controls.disabled === true;
    const tagsDisabled = disabled || controls.tagsDisabled === true;
    const summaryDisabled = disabled || controls.summaryDisabled === true;
    const coverDisabled = disabled || controls.coverDisabled === true || controls.coverBusy === true;
    const sourceDisabled = disabled || controls.sourceDisabled === true;
    const saveDisabled = disabled || controls.canSave === false;
    const tagsControl = controls.renderTagsControl?.({
      id: 'markdown-tags',
      label: pageLabels.tags,
      disabled: tagsDisabled,
    });
    const changeCover = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (file) controls.onCoverFile?.(file);
    };
    const changeVisibility = (event: ChangeEvent<HTMLSelectElement>) => {
      controls.onSourceVisibilityChange?.(
        event.currentTarget.value === 'private' ? 'private' : 'open',
      );
    };
    const sharedEditorOptions = quiver
      ? {
          ...editorOptions,
          extendTopBar: (builder: Parameters<typeof appendWriterQuiverTopBar>[0]) => {
            editorOptions?.extendTopBar?.(builder);
            appendWriterQuiverTopBar(builder, quiver.onOpen, quiver.label);
          },
        }
      : editorOptions;

    return (
      <MarkdownWriter
        {...writerProps}
        ref={forwardedRef}
        editorOptions={sharedEditorOptions}
        toolbarAfterTitle={(
          <>
            <div className="rin-ui-field writer-tags-field">
              <label htmlFor="markdown-tags" className="rin-compat-label">{pageLabels.tags}</label>
              <div className="writer-tags-control">
                {tagsControl ?? (
                  <input
                    id="markdown-tags"
                    className="rin-ui-control writer-tags-input"
                    value={controls.tags ?? ''}
                    disabled={tagsDisabled}
                    onChange={(event) => controls.onTagsChange?.(event.currentTarget.value)}
                  />
                )}
                <button
                  type="button"
                  className={controls.summaryCustomized
                    ? 'writer-summary-button active'
                    : 'writer-summary-button'}
                  disabled={summaryDisabled}
                  onClick={controls.onOpenSummary}
                >
                  <SummaryIcon />
                  <span>{pageLabels.summary}</span>
                </button>
              </div>
            </div>
            <div className="rin-ui-field writer-cover-field">
              <label htmlFor="markdown-cover" className="rin-compat-label">{pageLabels.cover}</label>
              <div className="writer-cover-control">
                {controls.coverUrl
                  ? <img src={controls.coverUrl} alt="" />
                  : <span>16:9</span>}
                <label className="writer-cover-upload-button" htmlFor="markdown-cover">
                  <ImageIcon />
                  <span>{controls.coverUrl ? pageLabels.changeCover : pageLabels.uploadCover}</span>
                  <input
                    id="markdown-cover"
                    type="file"
                    accept="image/*"
                    disabled={coverDisabled}
                    onChange={changeCover}
                  />
                </label>
                {controls.coverUrl ? (
                  <button
                    type="button"
                    className="writer-cover-remove-button"
                    disabled={coverDisabled}
                    onClick={controls.onRemoveCover}
                  >
                    {pageLabels.removeCover}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="writer-topbar-actions">
              <div className="markdown-status-controls" aria-label={pageLabels.saveState}>
                <label className="markdown-status-select-label">
                  <span>{pageLabels.source}</span>
                  <select
                    className="markdown-status-select"
                    value={controls.sourceVisibility ?? 'open'}
                    disabled={sourceDisabled}
                    aria-label={pageLabels.sourceVisibility}
                    onChange={changeVisibility}
                  >
                    <option value="open">{pageLabels.openSource}</option>
                    <option value="private">{pageLabels.privateSource}</option>
                  </select>
                </label>
              </div>
              <button
                className="writer-save-button"
                type="button"
                disabled={saveDisabled}
                onClick={controls.onSaveDraft}
              >
                {controls.savingMode === 'draft' ? pageLabels.saving : pageLabels.saveDraft}
              </button>
              <button
                className="primary-button writer-save-button"
                type="button"
                disabled={saveDisabled}
                onClick={controls.onPublish}
              >
                {controls.savingMode
                  ? controls.savingMode === 'published'
                    ? pageLabels.publishing
                    : pageLabels.saving
                  : pageLabels.publish}
              </button>
            </div>
          </>
        )}
        afterEditor={dialogs}
      />
    );
  },
);
