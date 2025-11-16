import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import { markdownMediaShortcodes, extractMediaFromTokens } from '../../src/core/markdown-media-shortcodes.js';

describe('Markdown Media Shortcodes Plugin', () => {
  describe('Audio shortcode parsing', () => {
    it('should parse a simple audio shortcode', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = '{{audio src="test.mp3"}}';
      const tokens = md.parse(markdown, {});
      const mediaItems = extractMediaFromTokens(tokens);
      
      expect(mediaItems).toHaveLength(1);
      expect(mediaItems[0].shortcode).toBe('audio');
      expect(mediaItems[0].src).toBe('test.mp3');
      expect(mediaItems[0].id).toBeDefined();
    });

    it('should parse audio shortcode with title', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = '{{audio src="../media/sample.mp3" title="Sample Audio"}}';
      const tokens = md.parse(markdown, {});
      const mediaItems = extractMediaFromTokens(tokens);
      
      expect(mediaItems).toHaveLength(1);
      expect(mediaItems[0].shortcode).toBe('audio');
      expect(mediaItems[0].src).toBe('../media/sample.mp3');
      expect(mediaItems[0].title).toBe('Sample Audio');
    });

    it('should parse audio shortcode with single quotes', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = "{{audio src='test.mp3' title='My Audio'}}";
      const tokens = md.parse(markdown, {});
      const mediaItems = extractMediaFromTokens(tokens);
      
      expect(mediaItems).toHaveLength(1);
      expect(mediaItems[0].src).toBe('test.mp3');
      expect(mediaItems[0].title).toBe('My Audio');
    });

    it('should parse audio shortcode with custom id', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = '{{audio src="test.mp3" id="custom-audio-id"}}';
      const tokens = md.parse(markdown, {});
      const mediaItems = extractMediaFromTokens(tokens);
      
      expect(mediaItems).toHaveLength(1);
      expect(mediaItems[0].id).toBe('custom-audio-id');
    });
  });

  describe('Video shortcode parsing', () => {
    it('should parse a simple video shortcode', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = '{{video src="test.mp4"}}';
      const tokens = md.parse(markdown, {});
      const mediaItems = extractMediaFromTokens(tokens);
      
      expect(mediaItems).toHaveLength(1);
      expect(mediaItems[0].shortcode).toBe('video');
      expect(mediaItems[0].src).toBe('test.mp4');
      expect(mediaItems[0].id).toBeDefined();
    });

    it('should parse video shortcode with poster', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = '{{video src="../media/video.mp4" poster="../media/poster.jpg" title="Sample Video"}}';
      const tokens = md.parse(markdown, {});
      const mediaItems = extractMediaFromTokens(tokens);
      
      expect(mediaItems).toHaveLength(1);
      expect(mediaItems[0].shortcode).toBe('video');
      expect(mediaItems[0].src).toBe('../media/video.mp4');
      expect(mediaItems[0].poster).toBe('../media/poster.jpg');
      expect(mediaItems[0].title).toBe('Sample Video');
    });
  });

  describe('Multiple shortcodes', () => {
    it('should parse multiple shortcodes in one file', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = `
# Test Lesson

Here is an audio file:
{{audio src="audio1.mp3" title="First Audio"}}

And here is a video:
{{video src="video1.mp4" title="First Video"}}

And another audio:
{{audio src="audio2.mp3" title="Second Audio"}}
`;
      
      const tokens = md.parse(markdown, {});
      const mediaItems = extractMediaFromTokens(tokens);
      
      expect(mediaItems).toHaveLength(3);
      expect(mediaItems[0].shortcode).toBe('audio');
      expect(mediaItems[0].src).toBe('audio1.mp3');
      expect(mediaItems[1].shortcode).toBe('video');
      expect(mediaItems[1].src).toBe('video1.mp4');
      expect(mediaItems[2].shortcode).toBe('audio');
      expect(mediaItems[2].src).toBe('audio2.mp3');
    });

    it('should handle shortcodes mixed with regular markdown', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = `
# Introduction

This is a **bold** text and some *italic* text.

{{audio src="intro.mp3"}}

Here's a [link](https://example.com) and more text.

{{video src="demo.mp4"}}

- List item 1
- List item 2
`;
      
      const tokens = md.parse(markdown, {});
      const mediaItems = extractMediaFromTokens(tokens);
      
      expect(mediaItems).toHaveLength(2);
      
      // Verify HTML rendering still works
      const html = md.render(markdown);
      expect(html).toContain('<h1>Introduction</h1>');
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<em>italic</em>');
      expect(html).toContain('<a href="https://example.com">link</a>');
      expect(html).toContain('<schorm-media');
    });
  });

  describe('Rendering', () => {
    it('should render audio shortcode as placeholder HTML', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = '{{audio src="test.mp3" id="audio-1"}}';
      const html = md.render(markdown);
      
      expect(html).toContain('<schorm-media');
      expect(html).toContain('data-schorm-id="audio-1"');
      expect(html).toContain('data-type="audio"');
    });

    it('should render video shortcode as placeholder HTML', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = '{{video src="test.mp4" id="video-1"}}';
      const html = md.render(markdown);
      
      expect(html).toContain('<schorm-media');
      expect(html).toContain('data-schorm-id="video-1"');
      expect(html).toContain('data-type="video"');
    });

    it('should not render raw shortcode syntax in HTML', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = '{{audio src="test.mp3"}}';
      const html = md.render(markdown);
      
      expect(html).not.toContain('{{audio');
      expect(html).not.toContain('}}');
    });
  });

  describe('Error handling', () => {
    it('should ignore shortcodes without src attribute', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = '{{audio title="No Source"}}';
      const tokens = md.parse(markdown, {});
      const mediaItems = extractMediaFromTokens(tokens);
      
      // Should not parse if src is missing
      expect(mediaItems).toHaveLength(0);
    });

    it('should ignore non-media shortcodes', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = '{{image src="test.jpg"}} {{other src="test"}}';
      const tokens = md.parse(markdown, {});
      const mediaItems = extractMediaFromTokens(tokens);
      
      expect(mediaItems).toHaveLength(0);
    });

    it('should handle malformed shortcodes gracefully', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      // Missing closing braces
      const markdown1 = '{{audio src="test.mp3"';
      const html1 = md.render(markdown1);
      expect(html1).toContain('{{audio');
      
      // Missing opening braces
      const markdown2 = 'audio src="test.mp3"}}';
      const html2 = md.render(markdown2);
      expect(html2).not.toContain('schorm-media');
    });
  });

  describe('Token stream integrity', () => {
    it('should maintain correct token order', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = `
# Heading

Paragraph before media.

{{audio src="test.mp3"}}

Paragraph after media.
`;
      
      const tokens = md.parse(markdown, {});
      
      // Find the position of the schorm_media token
      let mediaTokenIndex = -1;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === 'paragraph_open' && tokens[i + 1].children) {
          for (const child of tokens[i + 1].children) {
            if (child.type === 'schorm_media') {
              mediaTokenIndex = i;
              break;
            }
          }
        }
      }
      
      expect(mediaTokenIndex).toBeGreaterThan(0);
    });

    it('should preserve surrounding content', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = 'Text before {{audio src="test.mp3"}} text after';
      const html = md.render(markdown);
      
      expect(html).toContain('Text before');
      expect(html).toContain('text after');
      expect(html).toContain('<schorm-media');
    });
  });

  describe('ID generation', () => {
    it('should generate unique IDs for media without explicit id', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = `
{{audio src="test1.mp3"}}
{{audio src="test2.mp3"}}
`;
      
      const tokens = md.parse(markdown, {});
      const mediaItems = extractMediaFromTokens(tokens);
      
      expect(mediaItems).toHaveLength(2);
      expect(mediaItems[0].id).toBeDefined();
      expect(mediaItems[1].id).toBeDefined();
      expect(mediaItems[0].id).not.toBe(mediaItems[1].id);
    });

    it('should use provided ID when specified', () => {
      const md = new MarkdownIt();
      md.use(markdownMediaShortcodes);
      
      const markdown = '{{audio src="test.mp3" id="my-custom-id"}}';
      const tokens = md.parse(markdown, {});
      const mediaItems = extractMediaFromTokens(tokens);
      
      expect(mediaItems[0].id).toBe('my-custom-id');
    });
  });

  describe('Integration with markdown processing', () => {
    it('should work with parseWithMedia in MarkdownProcessor', () => {
      // This is tested in the markdown.test.ts file
      // Here we just ensure the plugin exports work correctly
      expect(markdownMediaShortcodes).toBeDefined();
      expect(typeof markdownMediaShortcodes).toBe('function');
      expect(extractMediaFromTokens).toBeDefined();
      expect(typeof extractMediaFromTokens).toBe('function');
    });
  });
});
