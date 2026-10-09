import { expect, test } from 'vitest';

import {
  markdownCodeFenceForMilkdown,
  shouldPasteClipboardAsCodeBlock,
  shouldPasteClipboardAsMarkdown,
} from '../src/mathMarkdown';

test('does not parse ordinary source code copied from a code editor as Markdown', () => {
  expect(
    shouldPasteClipboardAsMarkdown(
      'const x = 1;',
      '<pre style="white-space: pre-wrap; font-family: monospace">const x = 1;</pre>',
    ),
  ).toBe(false);
});

test('continues to intercept pasted display math', () => {
  expect(shouldPasteClipboardAsMarkdown('$$\\nx^2\\n$$', '')).toBe(true);
});

test('recognizes source code copied from a code editor as a code block paste', () => {
  expect(
    shouldPasteClipboardAsCodeBlock(
      'const x = 1;',
      '<pre style="white-space: pre-wrap; font-family: monospace">const x = 1;</pre>',
    ),
  ).toBe(true);
});

test('wraps source code in a fence longer than its backtick runs', () => {
  expect(markdownCodeFenceForMilkdown('const snippet = `value`;')).toBe(
    '```\nconst snippet = `value`;\n```',
  );
  expect(markdownCodeFenceForMilkdown('```nested fence```')).toBe(
    '````\n```nested fence```\n````',
  );
});
