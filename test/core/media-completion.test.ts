/**
 * Tests for media completion tracking in the runtime
 * 
 * Since the runtime is pure JavaScript, we test it by:
 * 1. Loading the runtime code
 * 2. Verifying the structure and patterns exist
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Media Completion Tracking (Runtime)', () => {
  let runtimeCode: string;

  beforeEach(() => {
    // Load the runtime JavaScript file
    const runtimePath = path.join(process.cwd(), 'theme-default/assets/schorm-runtime.js');
    runtimeCode = fs.readFileSync(runtimePath, 'utf-8');
  });

  describe('SchormMedia Object', () => {
    it('should define SchormMedia object', () => {
      expect(runtimeCode).toContain('SchormMedia');
    });

    it('should have internal completion state', () => {
      expect(runtimeCode).toContain('_completionState');
    });

    it('should have tracked media IDs list', () => {
      expect(runtimeCode).toContain('_trackedMediaIds');
    });
  });

  describe('Core API Functions', () => {
    it('should define initMediaCompletionTracking function', () => {
      expect(runtimeCode).toContain('initMediaCompletionTracking');
    });

    it('should define markMediaCompleted function', () => {
      expect(runtimeCode).toContain('markMediaCompleted');
    });

    it('should define isMediaCompleted function', () => {
      expect(runtimeCode).toContain('isMediaCompleted');
    });

    it('should define getMediaCompletionState function', () => {
      expect(runtimeCode).toContain('getMediaCompletionState');
    });

    it('should define allMediaCompleted function', () => {
      expect(runtimeCode).toContain('allMediaCompleted');
    });
  });

  describe('Media Element Detection', () => {
    it('should query for .schorm-media[data-id] elements', () => {
      expect(runtimeCode).toContain(".schorm-media[data-id]");
    });

    it('should find nested audio or video elements', () => {
      expect(runtimeCode).toContain("container.querySelector('audio, video')");
    });

    it('should attach ended event listener', () => {
      expect(runtimeCode).toContain("addEventListener('ended'");
    });

    it('should handle missing data-id gracefully', () => {
      expect(runtimeCode).toContain('if (!mediaId)');
    });

    it('should use getAttribute for browser compatibility', () => {
      expect(runtimeCode).toContain("container.getAttribute('data-id')");
    });

    it('should use traditional for loop for browser compatibility', () => {
      expect(runtimeCode).toContain('for (var i = 0; i < mediaContainers.length; i++)');
    });
  });

  describe('Completion State Management', () => {
    it('should track completed status as boolean', () => {
      expect(runtimeCode).toContain('completed: true');
    });

    it('should track completion timestamp', () => {
      expect(runtimeCode).toContain('completedAt: Date.now()');
    });

    it('should be idempotent - not update already completed media', () => {
      expect(runtimeCode).toContain('Idempotent');
      expect(runtimeCode).toContain('!this._completionState[mediaId].completed');
    });

    it('should return copy of state to prevent external modification', () => {
      expect(runtimeCode).toContain('Return a copy to prevent external modification');
    });
  });

  describe('Preview Mode Integration', () => {
    it('should log media completion in preview mode', () => {
      expect(runtimeCode).toContain('schorm: media completed mediaId=');
    });

    it('should log all media completed in preview mode', () => {
      expect(runtimeCode).toContain('schorm: all media completed');
    });

    it('should log number of tracked media elements', () => {
      expect(runtimeCode).toContain("schorm: tracking ' + this._trackedMediaIds.length + ' media element(s)'");
    });

    it('should check isPreviewMode before logging', () => {
      expect(runtimeCode).toContain('SchormRuntime.isPreviewMode');
    });
  });

  describe('LocalStorage Persistence (Preview Mode)', () => {
    it('should have storage key function', () => {
      expect(runtimeCode).toContain('_getStorageKey');
    });

    it('should use schorm:media: prefix for storage key', () => {
      expect(runtimeCode).toContain("'schorm:media:'");
    });

    it('should persist state to localStorage', () => {
      expect(runtimeCode).toContain('_persistState');
      expect(runtimeCode).toContain('localStorage.setItem');
    });

    it('should load persisted state from localStorage', () => {
      expect(runtimeCode).toContain('_loadPersistedState');
      expect(runtimeCode).toContain('localStorage.getItem');
    });

    it('should only persist in preview mode', () => {
      expect(runtimeCode).toContain("if (!SchormRuntime.isPreviewMode)");
    });

    it('should handle localStorage errors gracefully', () => {
      expect(runtimeCode).toContain('schorm: Failed to persist media state');
      expect(runtimeCode).toContain('schorm: Failed to load persisted media state');
    });
  });

  describe('Debug Helpers', () => {
    it('should define SchormDebug object', () => {
      expect(runtimeCode).toContain('SchormDebug');
    });

    it('should define dumpMediaState function', () => {
      expect(runtimeCode).toContain('dumpMediaState');
    });

    it('should export schormDebug to window', () => {
      expect(runtimeCode).toContain('window.schormDebug = SchormDebug');
    });

    it('should log tracked IDs in dumpMediaState', () => {
      expect(runtimeCode).toContain("console.log('  Tracked IDs:', SchormMedia._trackedMediaIds)");
    });

    it('should log completion state in dumpMediaState', () => {
      expect(runtimeCode).toContain("console.log('  Completion State:', SchormMedia.getMediaCompletionState())");
    });

    it('should log allMediaCompleted status in dumpMediaState', () => {
      expect(runtimeCode).toContain("console.log('  All Completed:', SchormMedia.allMediaCompleted())");
    });
  });

  describe('Auto-Initialization', () => {
    it('should call initMediaCompletionTracking on DOMContentLoaded', () => {
      expect(runtimeCode).toContain('SchormMedia.initMediaCompletionTracking()');
    });

    it('should export SchormMedia to window', () => {
      expect(runtimeCode).toContain('window.SchormMedia = SchormMedia');
    });
  });

  describe('allMediaCompleted Logic', () => {
    it('should return true if no media is tracked', () => {
      expect(runtimeCode).toContain('if (this._trackedMediaIds.length === 0)');
      expect(runtimeCode).toContain('return true');
    });

    it('should iterate through tracked media IDs', () => {
      expect(runtimeCode).toContain('for (var i = 0; i < this._trackedMediaIds.length; i++)');
    });

    it('should return false if any media is not completed', () => {
      expect(runtimeCode).toContain('if (!this.isMediaCompleted(mediaId))');
      expect(runtimeCode).toContain('return false');
    });
  });
});

describe('Media Block Template', () => {
  let templateCode: string;

  beforeEach(() => {
    const templatePath = path.join(process.cwd(), 'theme-default/partials/media-block.html');
    templateCode = fs.readFileSync(templatePath, 'utf-8');
  });

  it('should add schorm-media class when media.id is present', () => {
    expect(templateCode).toContain('{{#if media.id}} schorm-media{{/if}}');
  });

  it('should add data-id attribute when media.id is present', () => {
    expect(templateCode).toContain('{{#if media.id}} data-id="{{media.id}}"{{/if}}');
  });

  it('should have video element for video type', () => {
    expect(templateCode).toContain('<video controls');
  });

  it('should have audio element for audio type', () => {
    expect(templateCode).toContain('<audio controls');
  });
});
