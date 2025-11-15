/**
 * Markdown processing and rendering
 */

import MarkdownIt from 'markdown-it';

export class MarkdownProcessor {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });
  }

  render(markdown: string): string {
    // TODO: Add custom plugins and configuration
    return this.md.render(markdown);
  }

  renderInline(markdown: string): string {
    return this.md.renderInline(markdown);
  }
}

export function renderMarkdown(markdown: string): string {
  const processor = new MarkdownProcessor();
  return processor.render(markdown);
}
