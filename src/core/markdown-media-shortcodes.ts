/**
 * Markdown-it plugin for parsing Schorm media shortcodes
 * Handles {{audio}} and {{video}} shortcodes
 */

import type MarkdownIt from 'markdown-it';

export interface MediaAttributes {
  shortcode: 'audio' | 'video' | 'image';
  src: string;
  title?: string;
  poster?: string;
  id: string;
}

/**
 * Generate a deterministic ID for a media item.
 *
 * The ID is derived purely from the shortcode, the source filename, and the
 * item's occurrence index within the document, so the same document produces
 * the same IDs on every build (the IDs ship in the built HTML as data-id
 * attributes). The index keeps repeated identical sources unique.
 */
function generateMediaId(shortcode: string, src: string, index: number): string {
  const filename =
    src
      .split('/')
      .pop()
      ?.replace(/\.[^.]+$/, '') || 'media';
  return `${shortcode}-${filename}-${index}`;
}

/**
 * Parse attributes from a shortcode string
 * Supports both single and double quotes
 * Example: 'src="file.mp3" title="My Audio"'
 */
function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};

  // Match key="value" or key='value' patterns
  const attrRegex = /(\w+)=["']([^"']+)["']/g;
  let match;

  while ((match = attrRegex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }

  return attrs;
}

/**
 * Validate required attributes for a shortcode
 */
function validateAttributes(shortcode: string, attrs: Record<string, string>): void {
  if (!attrs.src) {
    throw new Error(`${shortcode} shortcode requires 'src' attribute`);
  }
}

/**
 * Parse a media shortcode and return its attributes.
 * When no explicit id attribute is given, one is generated deterministically
 * from the shortcode, filename, and the document-scoped occurrence index
 * supplied by the caller.
 */
function parseShortcode(content: string, nextMediaIndex: () => number): MediaAttributes {
  // Extract shortcode type (audio or video)
  const typeMatch = content.match(/^(audio|video)\s/);
  if (!typeMatch) {
    throw new Error('Invalid shortcode: must start with "audio" or "video"');
  }

  const shortcode = typeMatch[1] as 'audio' | 'video';

  // Extract attributes string (everything after the shortcode type)
  const attrString = content.substring(shortcode.length).trim();
  const attrs = parseAttributes(attrString);

  // Validate required attributes
  validateAttributes(shortcode, attrs);

  // Generate ID if not provided
  const id = attrs.id || generateMediaId(shortcode, attrs.src, nextMediaIndex());

  return {
    shortcode,
    src: attrs.src,
    title: attrs.title,
    poster: attrs.poster,
    id,
  };
}

/**
 * Return the next document-scoped media occurrence index, stored on the
 * markdown-it env so each parse pass starts from zero
 */
function nextMediaIndexFromEnv(env: Record<string, unknown>): () => number {
  return () => {
    const current = typeof env._schormMediaIndex === 'number' ? env._schormMediaIndex : 0;
    env._schormMediaIndex = current + 1;
    return current;
  };
}

/**
 * Inline rule to detect and parse media shortcodes
 */
function mediaShortcodeRule(state: any, silent: boolean): boolean {
  const start = state.pos;
  const max = state.posMax;

  // Quick check: must start with {{
  if (
    state.src.charCodeAt(start) !== 0x7b /* { */ ||
    state.src.charCodeAt(start + 1) !== 0x7b /* { */
  ) {
    return false;
  }

  // Find the closing }}
  let end = start + 2;
  let foundClose = false;

  while (end < max - 1) {
    if (
      state.src.charCodeAt(end) === 0x7d /* } */ &&
      state.src.charCodeAt(end + 1) === 0x7d /* } */
    ) {
      foundClose = true;
      break;
    }
    end++;
  }

  if (!foundClose) {
    return false;
  }

  // Extract content between {{ and }}
  const content = state.src.slice(start + 2, end).trim();

  // Check if it starts with 'audio' or 'video'
  if (!content.startsWith('audio') && !content.startsWith('video')) {
    return false;
  }

  // If we're in silent mode (just checking), return true
  if (silent) {
    return true;
  }

  // Parse the shortcode
  let mediaAttrs: MediaAttributes;
  try {
    mediaAttrs = parseShortcode(content, nextMediaIndexFromEnv(state.env || {}));
  } catch (error) {
    // If parsing fails, return false and let it be treated as regular text
    console.error('Error parsing shortcode:', error);
    return false;
  }

  // Create token
  const token = state.push('schorm_media', '', 0);
  token.meta = mediaAttrs;

  // Move position past the closing }}
  state.pos = end + 2;

  return true;
}

/**
 * Renderer rule for media shortcodes
 * Outputs a placeholder that will be replaced by Handlebars
 */
function renderMediaShortcode(tokens: any[], idx: number): string {
  const token = tokens[idx];
  const attrs = token.meta as MediaAttributes;

  // Return placeholder HTML with data attributes
  return `<schorm-media data-schorm-id="${attrs.id}" data-type="${attrs.shortcode}"></schorm-media>`;
}

/**
 * Register the media shortcode plugin with markdown-it
 */
export function markdownMediaShortcodes(md: MarkdownIt): void {
  // Register the inline rule
  md.inline.ruler.after('emphasis', 'schorm_media', mediaShortcodeRule);

  // Register the renderer
  md.renderer.rules['schorm_media'] = renderMediaShortcode;
}

/**
 * Extract media items from markdown-it tokens
 */
export function extractMediaFromTokens(tokens: any[]): MediaAttributes[] {
  const mediaItems: MediaAttributes[] = [];
  // Document-scoped occurrence index so image IDs are deterministic per parse
  let imageIndex = 0;

  function scanTokens(tokenList: any[]): void {
    for (const token of tokenList) {
      if (token.type === 'schorm_media' && token.meta) {
        mediaItems.push(token.meta as MediaAttributes);
      }

      // Extract markdown images
      if (token.type === 'image') {
        const src = token.attrGet('src');
        const alt = token.content || token.attrGet('alt') || '';
        if (src) {
          mediaItems.push({
            shortcode: 'image',
            src,
            title: alt,
            id: generateMediaId('image', src, imageIndex++),
          });
        }
      }

      // Recursively scan children
      if (token.children) {
        scanTokens(token.children);
      }
    }
  }

  scanTokens(tokens);
  return mediaItems;
}
