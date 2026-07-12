/**
 * Shared file-extension to MIME-type mapping, used by the preview server
 * and media processing
 */

export const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.xml': 'application/xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const DEFAULT_MIME_TYPE = 'application/octet-stream';

/**
 * Look up the MIME type for a file extension (with or without leading dot)
 */
export function getMimeType(extension: string): string {
  const key = extension.startsWith('.') ? extension : `.${extension}`;
  return MIME_TYPES[key.toLowerCase()] ?? DEFAULT_MIME_TYPE;
}
