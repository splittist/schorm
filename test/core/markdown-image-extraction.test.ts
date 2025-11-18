import { describe, it, expect } from 'vitest';
import { MarkdownProcessor } from '../../src/core/markdown.js';

describe('Markdown Image Extraction', () => {
  const processor = new MarkdownProcessor();

  describe('parseWithMedia', () => {
    it('should extract images from markdown', () => {
      const markdown = `
# Lesson Title

Here's an image:

![Alt text](media/image.jpg)

Some more content.
`;

      const { html, media } = processor.parseWithMedia(markdown);

      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('image');
      expect(media[0].src).toBe('media/image.jpg');
      expect(media[0].title).toBe('Alt text');
      expect(media[0].id).toMatch(/^image-image-/);
    });

    it('should extract multiple images', () => {
      const markdown = `
![Image 1](media/img1.jpg)
![Image 2](media/img2.png)
![Image 3](../media/img3.gif)
`;

      const { media } = processor.parseWithMedia(markdown);

      expect(media).toHaveLength(3);
      expect(media[0].src).toBe('media/img1.jpg');
      expect(media[1].src).toBe('media/img2.png');
      expect(media[2].src).toBe('../media/img3.gif');
    });

    it('should extract both images and audio shortcodes', () => {
      const markdown = `
![Diagram](media/diagram.png)

{{audio src="../media/audio.mp3" title="Audio Track"}}

![Chart](media/chart.jpg)
`;

      const { media } = processor.parseWithMedia(markdown);

      expect(media).toHaveLength(3);
      expect(media[0].type).toBe('image');
      expect(media[0].src).toBe('media/diagram.png');
      expect(media[1].type).toBe('audio');
      expect(media[1].src).toBe('../media/audio.mp3');
      expect(media[2].type).toBe('image');
      expect(media[2].src).toBe('media/chart.jpg');
    });

    it('should extract images and video shortcodes together', () => {
      const markdown = `
# Multimedia Content

![Preview](media/preview.jpg)

{{video src="../media/video.mp4" poster="../media/poster.jpg" title="Demo Video"}}

![Footer](media/footer.png)
`;

      const { media } = processor.parseWithMedia(markdown);

      expect(media).toHaveLength(3);
      expect(media[0].type).toBe('image');
      expect(media[1].type).toBe('video');
      expect(media[2].type).toBe('image');
    });

    it('should handle images with empty alt text', () => {
      const markdown = '![](media/no-alt.jpg)';

      const { media } = processor.parseWithMedia(markdown);

      expect(media).toHaveLength(1);
      expect(media[0].title).toBe('');
    });

    it('should handle images with special characters in alt text', () => {
      const markdown = '![This is "quoted" & special](media/image.jpg)';

      const { media } = processor.parseWithMedia(markdown);

      expect(media).toHaveLength(1);
      expect(media[0].title).toContain('quoted');
      expect(media[0].title).toContain('special');
    });

    it('should generate unique IDs for multiple images with same filename', () => {
      const markdown = `
![Image 1](media/same.jpg)
![Image 2](media/same.jpg)
`;

      const { media } = processor.parseWithMedia(markdown);

      expect(media).toHaveLength(2);
      expect(media[0].id).not.toBe(media[1].id);
      // Both should have same base but different timestamps
      expect(media[0].id).toMatch(/^image-same-/);
      expect(media[1].id).toMatch(/^image-same-/);
    });

    it('should not extract inline link as image', () => {
      const markdown = '[This is a link](https://example.com)';

      const { media } = processor.parseWithMedia(markdown);

      expect(media).toHaveLength(0);
    });

    it('should extract images within lists', () => {
      const markdown = `
- Item 1
  ![Image 1](media/img1.jpg)
- Item 2
  ![Image 2](media/img2.jpg)
`;

      const { media } = processor.parseWithMedia(markdown);

      expect(media).toHaveLength(2);
      expect(media[0].src).toBe('media/img1.jpg');
      expect(media[1].src).toBe('media/img2.jpg');
    });

    it('should extract images in blockquotes', () => {
      const markdown = `
> This is a quote
> ![Quote Image](media/quote.jpg)
`;

      const { media } = processor.parseWithMedia(markdown);

      expect(media).toHaveLength(1);
      expect(media[0].src).toBe('media/quote.jpg');
    });

    it('should handle images with relative paths', () => {
      const markdown = `
![Relative](../media/m1/audio.jpg)
![Current](./local/image.png)
`;

      const { media } = processor.parseWithMedia(markdown);

      expect(media).toHaveLength(2);
      expect(media[0].src).toBe('../media/m1/audio.jpg');
      expect(media[1].src).toBe('./local/image.png');
    });

    it('should preserve HTML rendering with images', () => {
      const markdown = `
# Title

![Image](media/img.jpg)

Some text
`;

      const { html } = processor.parseWithMedia(markdown);

      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('<img');
      expect(html).toContain('src="media/img.jpg"');
      expect(html).toContain('alt="Image"');
      expect(html).toContain('Some text');
    });

    it('should handle mixed content correctly', () => {
      const markdown = `
# Lesson

**Bold text** and *italic text*.

![Image](media/img.jpg)

\`\`\`javascript
const x = 5;
\`\`\`

{{audio src="../media/audio.mp3"}}

- List item
- Another item
`;

      const { html, media } = processor.parseWithMedia(markdown);

      expect(media).toHaveLength(2);
      expect(html).toContain('<strong>Bold text</strong>');
      expect(html).toContain('<code');
      expect(html).toContain('<li>List item</li>');
    });
  });
});
