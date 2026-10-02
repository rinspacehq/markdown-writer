/** Split a leading Markdown H1 into an external title field without changing the body. */
export function splitTitleMarkdown(markdown: string) {
  const normalized = markdown.replace(/\r\n?/g, '\n');
  const match = /^# ([^\n]+)(?:\n(?:\n)?|$)/.exec(normalized);
  if (!match) return { title: '', body: normalized };
  return { title: match[1], body: normalized.slice(match[0].length) };
}

/** Join an external title field and editor body into one Markdown document. */
export function joinTitleMarkdown(title: string, body: string) {
  const cleanTitle = title.replace(/\r\n?/g, ' ').replace(/\n/g, ' ').trim();
  const cleanBody = body.replace(/\r\n?/g, '\n');
  if (!cleanTitle) return cleanBody;
  return `# ${cleanTitle}${cleanBody ? `\n\n${cleanBody}` : '\n'}`;
}
