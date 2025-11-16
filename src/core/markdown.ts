/**
 * Markdown processing and rendering
 */

import MarkdownIt from 'markdown-it';
import matter from 'gray-matter';
import * as fs from 'fs';
import * as path from 'path';
import type { Lesson, LessonMetadata, MediaItem, Course } from './course-model.js';
import { validateLessonFrontmatter } from './course-model.js';
import { markdownMediaShortcodes, extractMediaFromTokens } from './markdown-media-shortcodes.js';

export class MarkdownProcessor {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });
    
    // Register the media shortcodes plugin
    this.md.use(markdownMediaShortcodes);
  }

  render(markdown: string): string {
    return this.md.render(markdown);
  }

  renderInline(markdown: string): string {
    return this.md.renderInline(markdown);
  }

  /**
   * Parse markdown and extract media tokens
   */
  parseWithMedia(markdown: string): { html: string; media: MediaItem[] } {
    const tokens = this.md.parse(markdown, {});
    const mediaAttrs = extractMediaFromTokens(tokens);
    
    // Convert media attributes to MediaItem format
    const media: MediaItem[] = mediaAttrs.map(attr => ({
      id: attr.id,
      type: attr.shortcode,
      src: attr.src,
      title: attr.title,
      poster: attr.poster,
    }));
    
    // Render to HTML
    const html = this.md.renderer.render(tokens, this.md.options, {});
    
    return { html, media };
  }
}

export function renderMarkdown(markdown: string): string {
  const processor = new MarkdownProcessor();
  return processor.render(markdown);
}

export function parseLesson(filePath: string, course: Course): Lesson {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Lesson file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(content);

  // Validate frontmatter against schema
  const validatedFrontmatter = validateLessonFrontmatter(
    parsed.data,
    course,
    filePath
  );

  // Render markdown to HTML and extract media
  const processor = new MarkdownProcessor();
  const { html: htmlContent, media } = processor.parseWithMedia(parsed.content);

  return {
    type: 'lesson',
    id: validatedFrontmatter.id,
    title: validatedFrontmatter.title,
    module: validatedFrontmatter.module,
    content: htmlContent,
    metadata: {
      duration: validatedFrontmatter.duration,
      objectives: validatedFrontmatter.objectives,
      // Include any extra frontmatter fields in metadata
      ...Object.fromEntries(
        Object.entries(validatedFrontmatter)
          .filter(([key]) => !['id', 'title', 'module', 'type', 'order', 'duration', 'objectives'].includes(key))
      ),
    },
    media: media.length > 0 ? media : undefined,
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
