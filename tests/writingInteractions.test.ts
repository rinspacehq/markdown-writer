import { expect, test } from 'vitest';

import { latexPreviewOptions } from '../src/writingInteractions';

test('keeps custom LaTeX previews untrusted by default', () => {
  expect(latexPreviewOptions()).toMatchObject({
    throwOnError: false,
    strict: false,
    trust: false,
  });
});

test('allows hosts to explicitly opt into trusted LaTeX previews', () => {
  expect(latexPreviewOptions(true)).toMatchObject({ trust: true });
});
