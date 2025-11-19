/**
 * Media file handling (images, audio, video)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MediaItem } from './course-model.js';

export interface MediaFile {
  originalPath: string;
  relativePath: string;
  type: 'image' | 'audio' | 'video' | 'document';
  mimeType: string;
}

export function detectMediaType(filePath: string): MediaFile['type'] {
  const ext = path.extname(filePath).toLowerCase();

  if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) {
    return 'image';
  } else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
    return 'audio';
  } else if (['.mp4', '.webm', '.mov', '.avi'].includes(ext)) {
    return 'video';
  }

  return 'document';
}

export function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function copyMediaFile(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    throw new Error(`Media file not found: ${src}`);
  }

  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(src, dest);
}

export function processMediaFiles(mediaDir: string, outputDir: string): MediaFile[] {
  const mediaFiles: MediaFile[] = [];

  if (!fs.existsSync(mediaDir)) {
    return mediaFiles;
  }

  function scanDirectory(dir: string, relativePath = ''): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);
      // Normalize path separators to forward slashes for cross-platform compatibility
      // This ensures manifest hrefs use forward slashes on all platforms
      const normalizedRelPath = relPath.split(path.sep).join('/');

      if (entry.isDirectory()) {
        scanDirectory(fullPath, relPath);
      } else if (entry.isFile()) {
        mediaFiles.push({
          originalPath: fullPath,
          relativePath: normalizedRelPath,
          type: detectMediaType(fullPath),
          mimeType: '', // TODO: Determine proper MIME type
        });
      }
    }
  }

  scanDirectory(mediaDir);

  // Copy all media files to output directory
  const outputMediaDir = path.join(outputDir, 'media');
  copyDirectory(mediaDir, outputMediaDir);

  return mediaFiles;
}

/**
 * Normalize a media path to be relative to project root
 * Handles relative paths like ../media/file.jpg and converts to media/file.jpg
 *
 * @param rawPath - The raw path from markdown/shortcode (e.g., "../media/m1/foo.jpg")
 * @param projectRoot - Absolute path to project root
 * @param contentFilePath - Optional path to the content file containing the reference
 * @returns Normalized path (e.g., "media/m1/foo.jpg")
 * @throws Error if path escapes project root
 */
export function normaliseMediaPath(
  rawPath: string,
  projectRoot: string,
  contentFilePath?: string
): string {
  // Normalize backslashes to forward slashes first
  const normalizedRawPath = rawPath.split('\\').join('/');

  // If path already starts with media/, return as-is
  if (normalizedRawPath.startsWith('media/')) {
    return normalizedRawPath;
  }

  let resolvedPath: string;

  // If path contains ../ or ./, resolve relative to content file or project root
  if (normalizedRawPath.includes('../') || normalizedRawPath.includes('./')) {
    if (contentFilePath) {
      // Resolve relative to the content file's directory
      const contentDir = path.dirname(contentFilePath);
      resolvedPath = path.resolve(contentDir, normalizedRawPath);
    } else {
      // Resolve relative to project root
      resolvedPath = path.resolve(projectRoot, normalizedRawPath);
    }
  } else {
    // Assume it's relative to media directory
    resolvedPath = path.resolve(projectRoot, 'media', normalizedRawPath);
  }

  // Ensure the resolved path is within project root
  const normalizedProjectRoot = path.resolve(projectRoot);
  const normalizedResolved = path.resolve(resolvedPath);

  if (!normalizedResolved.startsWith(normalizedProjectRoot)) {
    throw new Error(`Invalid media path: "${rawPath}" resolves outside project root`);
  }

  // Get path relative to project root
  let relativePath = path.relative(projectRoot, resolvedPath);

  // Normalize path separators to forward slashes for cross-platform consistency
  relativePath = relativePath.split(path.sep).join('/');

  // Special case: if the path contains /media/ anywhere, extract from media/ onwards
  // This handles cases like content/../media/file.jpg -> media/file.jpg
  const mediaIndex = relativePath.indexOf('/media/');
  if (mediaIndex !== -1) {
    relativePath = relativePath.substring(mediaIndex + 1); // Skip the leading /
  } else if (relativePath.startsWith('content/media/')) {
    // Handle content/media/ -> media/
    relativePath = relativePath.substring('content/'.length);
  }

  return relativePath;
}

/**
 * Normalize all media paths in a MediaItem array
 *
 * @param media - Array of media items with potentially relative paths
 * @param projectRoot - Absolute path to project root
 * @param contentFilePath - Optional path to the content file
 * @returns Array of media items with normalized paths
 */
export function normaliseMediaPaths(
  media: MediaItem[],
  projectRoot: string,
  contentFilePath?: string
): MediaItem[] {
  return media.map((item) => {
    try {
      return {
        ...item,
        src: normaliseMediaPath(item.src, projectRoot, contentFilePath),
        poster: item.poster
          ? normaliseMediaPath(item.poster, projectRoot, contentFilePath)
          : undefined,
      };
    } catch (error) {
      // Re-throw with additional context
      throw new Error(
        `Failed to normalize media path for item "${item.id}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}
