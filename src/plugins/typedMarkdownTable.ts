import { tableCellSchema, tableHeaderRowSchema, tableHeaderSchema, tableRowSchema, tableSchema } from '@milkdown/kit/preset/gfm';
import { Plugin, TextSelection } from '@milkdown/kit/prose/state';
import { $prose } from '@milkdown/kit/utils';

type ParsedMarkdownTableRow = {
  cells: string[];
};

function parseMarkdownTableRow(text: string): ParsedMarkdownTableRow | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  const cells = trimmed
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
  if (cells.length < 2) return null;
  return { cells };
}

function parseMarkdownTableAlignment(text: string, columnCount: number) {
  const row = parseMarkdownTableRow(text);
  if (!row || row.cells.length !== columnCount) return null;
  const alignments: Array<'left' | 'center' | 'right'> = [];
  for (const cell of row.cells) {
    if (!/^:?-{1,}:?$/.test(cell)) return null;
    const starts = cell.startsWith(':');
    const ends = cell.endsWith(':');
    alignments.push(starts && ends ? 'center' : ends ? 'right' : 'left');
  }
  return alignments;
}

function normalizeMarkdownTableCells(cells: string[], columnCount: number) {
  return Array.from({ length: columnCount }, (_value, index) => cells[index] || '');
}

export const rinTypedMarkdownTableInputPlugin = $prose((ctx) => {
  return new Plugin({
    appendTransaction: (transactions, _oldState, state) => {
      if (!transactions.some((transaction) => transaction.docChanged)) return null;

      const positions: number[] = [];
      let pos = 0;
      state.doc.forEach((node) => {
        positions.push(pos);
        pos += node.nodeSize;
      });

      for (let index = 0; index < state.doc.childCount - 3; index += 1) {
        const headerNode = state.doc.child(index);
        const separatorNode = state.doc.child(index + 1);
        if (headerNode.type.name !== 'paragraph' || separatorNode.type.name !== 'paragraph') {
          continue;
        }

        const header = parseMarkdownTableRow(headerNode.textContent);
        if (!header) continue;

        const columnCount = header.cells.length;
        const alignments = parseMarkdownTableAlignment(separatorNode.textContent, columnCount);
        if (!alignments) continue;

        const bodyRows: ParsedMarkdownTableRow[] = [];
        let closeIndex = index + 2;
        for (; closeIndex < state.doc.childCount; closeIndex += 1) {
          const rowNode = state.doc.child(closeIndex);
          if (rowNode.type.name !== 'paragraph') break;
          if (rowNode.textContent.trim() === '') break;
          const row = parseMarkdownTableRow(rowNode.textContent);
          if (!row) break;
          bodyRows.push(row);
        }

        if (bodyRows.length === 0) continue;
        if (closeIndex >= state.doc.childCount) continue;
        const closingNode = state.doc.child(closeIndex);
        if (!closingNode || closingNode.type.name !== 'paragraph' || closingNode.textContent.trim() !== '') {
          continue;
        }

        const schema = state.schema;
        const paragraphType = schema.nodes.paragraph;
        const createCellContent = (text: string) =>
          paragraphType.create(null, text ? schema.text(text) : null);
        const headerCells = normalizeMarkdownTableCells(header.cells, columnCount).map(
          (text, cellIndex) =>
            tableHeaderSchema
              .type(ctx)
              .create({ alignment: alignments[cellIndex] }, createCellContent(text)),
        );
        const dataRows = bodyRows.map((row) =>
          tableRowSchema.type(ctx).create(
            null,
            normalizeMarkdownTableCells(row.cells, columnCount).map((text, cellIndex) =>
              tableCellSchema
                .type(ctx)
                .create({ alignment: alignments[cellIndex] }, createCellContent(text)),
            ),
          ),
        );
        const tableNode = tableSchema.type(ctx).create(null, [
          tableHeaderRowSchema.type(ctx).create(null, headerCells),
          ...dataRows,
        ]);
        const from = positions[index];
        const to = positions[closeIndex];
        const tr = state.tr.replaceWith(from, to, tableNode);
        const nextSelectionPos = Math.min(from + tableNode.nodeSize + 1, tr.doc.content.size);
        tr.setSelection(TextSelection.create(tr.doc, nextSelectionPos));
        return tr.scrollIntoView();
      }

      return null;
    },
  });
});
