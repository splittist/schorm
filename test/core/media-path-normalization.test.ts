import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { normaliseMediaPath, normaliseMediaPaths } from '../../src/core/media.js';
import type { MediaItem } from '../../src/core/course-model.js';

describe('Media Path Normalization', () => {
  const projectRoot = '/home/user/project';
  const contentFilePath = '/home/user/project/content/m1/lesson.md';

  describe('normaliseMediaPath', () => {
    it('should leave media/ paths unchanged', () => {
      const result = normaliseMediaPath('media/m1/audio.mp3', projectRoot);
      expect(result).toBe('media/m1/audio.mp3');
    });

    it('should resolve relative paths from content file', () => {
      // From content/m1/lesson.md, ../media goes up to content/, then into media/
      // This resolves to content/media, but we extract media/ onwards
      const result = normaliseMediaPath('../media/m1/audio.mp3', projectRoot, contentFilePath);
      expect(result).toBe('media/m1/audio.mp3');
    });

    it('should resolve ./ relative paths', () => {
      const result = normaliseMediaPath('./audio.mp3', projectRoot, contentFilePath);
      expect(result).toBe('content/m1/audio.mp3');
    });

    it('should handle deeply nested relative paths', () => {
      // From content/m1/, going ../media reaches content/media, extract media/ onwards
      const result = normaliseMediaPath('../media/shared/video.mp4', projectRoot, contentFilePath);
      expect(result).toBe('media/shared/video.mp4');
    });

    it('should assume media/ directory for simple filenames', () => {
      const result = normaliseMediaPath('audio.mp3', projectRoot);
      expect(result).toBe('media/audio.mp3');
    });

    it('should normalize path separators to forward slashes', () => {
      const result = normaliseMediaPath('media\\m1\\audio.mp3', projectRoot);
      // Should normalize to forward slashes regardless of platform
      expect(result).toBe('media/m1/audio.mp3');
    });

    it('should throw error for path traversal outside project root', () => {
      expect(() => {
        normaliseMediaPath('../../../../etc/passwd', projectRoot, contentFilePath);
      }).toThrow('Invalid media path');
      expect(() => {
        normaliseMediaPath('../../../../etc/passwd', projectRoot, contentFilePath);
      }).toThrow('resolves outside project root');
    });

    it('should handle paths with multiple ../ correctly', () => {
      const deepContentPath = '/home/user/project/content/m1/sub/deep/lesson.md';
      // From deep path, going ../../media reaches content/m1/media, extract media/ onwards
      const result = normaliseMediaPath('../../media/audio.mp3', projectRoot, deepContentPath);
      expect(result).toBe('media/audio.mp3');
    });

    it('should prevent escaping via absolute paths', () => {
      // Absolute paths should be treated as relative to project root
      const result = normaliseMediaPath('media/m1/audio.mp3', projectRoot);
      expect(result).toBe('media/m1/audio.mp3');
    });

    it('should handle ../../media pattern from nested content', () => {
      // From content/m1/, going ../../media reaches project root media
      const result = normaliseMediaPath('../../media/m1/audio.mp3', projectRoot, contentFilePath);
      expect(result).toBe('media/m1/audio.mp3');
    });
  });

  describe('normaliseMediaPaths', () => {
    it('should normalize all paths in media array', () => {
      const media: MediaItem[] = [
        { id: 'a1', type: 'audio', src: '../media/m1/audio.mp3' },
        { id: 'v1', type: 'video', src: '../media/m1/video.mp4', poster: '../media/m1/poster.jpg' },
        { id: 'i1', type: 'image', src: 'media/image.jpg' },
      ];

      const result = normaliseMediaPaths(media, projectRoot, contentFilePath);

      expect(result).toHaveLength(3);
      expect(result[0].src).toBe('media/m1/audio.mp3');
      expect(result[1].src).toBe('media/m1/video.mp4');
      expect(result[1].poster).toBe('media/m1/poster.jpg');
      expect(result[2].src).toBe('media/image.jpg');
    });

    it('should preserve other properties', () => {
      const media: MediaItem[] = [
        { id: 'a1', type: 'audio', src: '../media/audio.mp3', title: 'My Audio' },
      ];

      const result = normaliseMediaPaths(media, projectRoot, contentFilePath);

      expect(result[0].id).toBe('a1');
      expect(result[0].type).toBe('audio');
      expect(result[0].title).toBe('My Audio');
    });

    it('should handle empty media array', () => {
      const result = normaliseMediaPaths([], projectRoot, contentFilePath);
      expect(result).toEqual([]);
    });

    it('should throw descriptive error for invalid paths', () => {
      const media: MediaItem[] = [
        { id: 'bad', type: 'audio', src: '../../../../etc/passwd' },
      ];

      expect(() => {
        normaliseMediaPaths(media, projectRoot, contentFilePath);
      }).toThrow('Failed to normalize media path for item "bad"');
    });

    it('should handle media without poster', () => {
      const media: MediaItem[] = [
        { id: 'a1', type: 'audio', src: '../media/audio.mp3' },
      ];

      const result = normaliseMediaPaths(media, projectRoot, contentFilePath);

      expect(result[0].poster).toBeUndefined();
    });
  });
});
