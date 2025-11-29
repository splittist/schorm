import { describe, it, expect } from 'vitest';
import { TemplateEngine } from '../../src/core/templates.js';

describe('TemplateEngine Helpers', () => {
  describe('contains helper', () => {
    it('should return true when array contains value', () => {
      const engine = new TemplateEngine();
      const template = '{{#if (contains myArray "b")}}YES{{else}}NO{{/if}}';
      const result = engine.render(template, { myArray: ['a', 'b', 'c'] });
      expect(result).toBe('YES');
    });

    it('should return false when array does not contain value', () => {
      const engine = new TemplateEngine();
      const template = '{{#if (contains myArray "d")}}YES{{else}}NO{{/if}}';
      const result = engine.render(template, { myArray: ['a', 'b', 'c'] });
      expect(result).toBe('NO');
    });

    it('should handle empty array', () => {
      const engine = new TemplateEngine();
      const template = '{{#if (contains myArray "a")}}YES{{else}}NO{{/if}}';
      const result = engine.render(template, { myArray: [] });
      expect(result).toBe('NO');
    });

    it('should handle non-array gracefully', () => {
      const engine = new TemplateEngine();
      const template = '{{#if (contains myValue "a")}}YES{{else}}NO{{/if}}';
      const result = engine.render(template, { myValue: 'not-an-array' });
      expect(result).toBe('NO');
    });

    it('should handle null/undefined gracefully', () => {
      const engine = new TemplateEngine();
      const template = '{{#if (contains myValue "a")}}YES{{else}}NO{{/if}}';
      const result = engine.render(template, { myValue: null });
      expect(result).toBe('NO');
    });
  });

  describe('eq helper', () => {
    it('should return true for equal values', () => {
      const engine = new TemplateEngine();
      const template = '{{#if (eq a b)}}EQUAL{{else}}NOT EQUAL{{/if}}';
      const result = engine.render(template, { a: 'test', b: 'test' });
      expect(result).toBe('EQUAL');
    });

    it('should return false for different values', () => {
      const engine = new TemplateEngine();
      const template = '{{#if (eq a b)}}EQUAL{{else}}NOT EQUAL{{/if}}';
      const result = engine.render(template, { a: 'test', b: 'other' });
      expect(result).toBe('NOT EQUAL');
    });
  });

  describe('add1 helper', () => {
    it('should add 1 to a number', () => {
      const engine = new TemplateEngine();
      const template = '{{add1 index}}';
      const result = engine.render(template, { index: 0 });
      expect(result).toBe('1');
    });

    it('should convert 0-based index to 1-based', () => {
      const engine = new TemplateEngine();
      const template = 'Question {{add1 index}}';
      const result = engine.render(template, { index: 2 });
      expect(result).toBe('Question 3');
    });

    it('should handle non-number by returning 1', () => {
      const engine = new TemplateEngine();
      const template = '{{add1 value}}';
      const result = engine.render(template, { value: 'not-a-number' });
      expect(result).toBe('1');
    });
  });
});
