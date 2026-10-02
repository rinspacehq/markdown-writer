import katex, { type KatexOptions } from 'katex';

export const rinTopBarMathIcon = `
  <span data-rin-topbar-math="true">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <path fill="currentColor" d="M7 19v-.808L13.096 12L7 5.808V5h10v1.25H9.102L14.727 12l-5.625 5.77H17V19z"></path>
    </svg>
  </span>
`;

const latexPlaceholderPreviewClass = 'rin-latex-placeholder-preview';

type ProseMirrorNodeLike = {
  type: { name: string };
  attrs: Record<string, unknown>;
  textContent: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function proseMirrorNodeFromElement(element: HTMLElement): ProseMirrorNodeLike | null {
  const viewDesc = (element as HTMLElement & { pmViewDesc?: unknown }).pmViewDesc;
  if (!isRecord(viewDesc)) return null;
  const node = viewDesc.node;
  if (!isRecord(node)) return null;
  const type = node.type;
  if (!isRecord(type) || typeof type.name !== 'string') return null;
  const attrs = node.attrs;
  if (!isRecord(attrs)) return null;
  return {
    type: { name: type.name },
    attrs,
    textContent: typeof node.textContent === 'string' ? node.textContent : '',
  };
}

function codeBlockLanguage(block: HTMLElement) {
  const node = proseMirrorNodeFromElement(block);
  if (node?.type.name === 'code_block') return String(node.attrs.language || '');

  const codeMirrorContent = block.querySelector('.cm-content');
  if (codeMirrorContent instanceof HTMLElement) {
    if (codeMirrorContent.dataset.language === 'stex') return 'LaTeX';
    return codeMirrorContent.dataset.language || '';
  }
  return '';
}

function latexCodeBlockContent(block: HTMLElement) {
  const node = proseMirrorNodeFromElement(block);
  if (node?.type.name === 'code_block') return node.textContent;

  const codeMirrorContent = block.querySelector('.cm-content');
  if (codeMirrorContent instanceof HTMLElement) return codeMirrorContent.textContent || '';
  return block.querySelector('.milkdown-code-block-placeholder code')?.textContent || '';
}

function directLatexPlaceholderPreview(block: HTMLElement) {
  return Array.from(block.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.classList.contains(latexPlaceholderPreviewClass),
  );
}

function isLatexCodeBlockElement(block: HTMLElement) {
  const language = codeBlockLanguage(block).toLowerCase();
  return language === 'latex' || language === 'stex';
}

export function syncLatexCodeBlockElement(
  block: HTMLElement,
  katexOptions?: KatexOptions,
) {
  const hasCodeMirrorContent = Boolean(block.querySelector('.cm-content'));
  const content = latexCodeBlockContent(block).trim();
  const isLatexBlock =
    isLatexCodeBlockElement(block) && (hasCodeMirrorContent || content.length > 0);
  block.classList.toggle('rin-latex-block', isLatexBlock);

  const existingPreview = directLatexPlaceholderPreview(block);
  if (!isLatexBlock || hasCodeMirrorContent) {
    existingPreview?.remove();
    return;
  }
  if (existingPreview?.dataset.source === content) return;

  const preview = existingPreview || document.createElement('div');
  preview.className = `preview ${latexPlaceholderPreviewClass}`;
  preview.dataset.source = content;
  preview.innerHTML = katex.renderToString(content, {
    ...katexOptions,
    throwOnError: false,
    displayMode: true,
  });
  if (!existingPreview) block.appendChild(preview);
}
