/**
 * Markdown processing and rendering
 */

import MarkdownIt from 'markdown-it';
import matter from 'gray-matter';
import * as fs from 'fs';
import * as path from 'path';
import type { Lesson, LessonMetadata } from './course-model.js';

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

export function parseLesson(filePath: string): Lesson {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Lesson file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(content);

  const metadata = parsed.data as LessonMetadata & { id?: string; title?: string; module?: string };
  const id = metadata.id || path.basename(filePath, '.md');
  const title = metadata.title || id;
  const module = metadata.module;

  // Render markdown to HTML
  const htmlContent = renderMarkdown(parsed.content);

  return {
    id,
    title,
    content: htmlContent,
    metadata,
    module,
  };
}

export function findLessons(contentDir: string): string[] {
  const lessons: string[] = [];

  function scanDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        lessons.push(fullPath);
      }
    }
  }

  scanDirectory(contentDir);
  return lessons;
}
