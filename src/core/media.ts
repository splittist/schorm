/**
 * Media file handling (images, audio, video)
 */

import * as fs from 'fs';
import * as path from 'path';

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
