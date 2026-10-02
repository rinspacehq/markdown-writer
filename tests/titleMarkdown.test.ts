import { describe, expect, it } from 'vitest';

import { joinTitleMarkdown, splitTitleMarkdown } from '../src/titleMarkdown';

describe('external Markdown title', () => {
  it('round-trips a leading H1 without duplicating it', () => {
    const markdown = '# Writing title\n\n## Section\n\n$e^{i\\pi}+1=0$';
    const parsed = splitTitleMarkdown(markdown);
    expect(parsed).toEqual({ title: 'Writing title', body: '## Section\n\n$e^{i\\pi}+1=0$' });
    expect(joinTitleMarkdown(parsed.title, parsed.body)).toBe(markdown);
  });

  it('preserves a later H1 in the body', () => {
    const markdown = '# Title\n\nParagraph\n\n# Existing imported heading';
    const parsed = splitTitleMarkdown(markdown);
    expect(joinTitleMarkdown(parsed.title, parsed.body)).toBe(markdown);
  });

  it('does not consume a body without a leading H1', () => {
    const markdown = 'Intro\n\n# Heading';
    expect(splitTitleMarkdown(markdown)).toEqual({ title: '', body: markdown });
  });
});
