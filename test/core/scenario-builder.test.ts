import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import { processScenarioLinks } from '../../src/core/scenario-builder.js';

describe('Scenario Builder', () => {
  describe('processScenarioLinks', () => {
    const md = new MarkdownIt({
      typographer: true
    });

    it('should convert simple markdown links to buttons', () => {
      const choices = [
        { label: 'Simple choice', targetId: 'target.md' }
      ];
      const markdown = `[Simple choice](target.md)`;
      const html = md.render(markdown);
      
      const result = processScenarioLinks(html, choices);
      
      expect(result).toContain('<button class="scenario-choice"');
      expect(result).toContain('data-target="target.md"');
      expect(result).toContain('>Simple choice</button>');
      expect(result).not.toContain('<a href="target.md"');
    });

    it('should convert links with straight double quotes to buttons', () => {
      const choices = [
        { label: 'Choice with "straight quotes"', targetId: 'target.md' }
      ];
      const markdown = `[Choice with "straight quotes"](target.md)`;
      const html = md.render(markdown);
      
      const result = processScenarioLinks(html, choices);
      
      expect(result).toContain('<button class="scenario-choice"');
      expect(result).toContain('data-target="target.md"');
      // With typographer enabled, straight quotes become curly quotes
      expect(result).toContain('\u201Cstraight quotes\u201D');
      expect(result).not.toContain('<a href="target.md"');
    });

    it('should convert links with curly double quotes to buttons', () => {
      const choices = [
        { label: 'Choice with \u201Ccurly quotes\u201D', targetId: 'target.md' }
      ];
      const markdown = `[Choice with \u201Ccurly quotes\u201D](target.md)`;
      const html = md.render(markdown);
      
      const result = processScenarioLinks(html, choices);
      
      expect(result).toContain('<button class="scenario-choice"');
      expect(result).toContain('data-target="target.md"');
      // Curly quotes remain as-is (not HTML-encoded)
      expect(result).toContain('\u201Ccurly quotes\u201D');
      expect(result).not.toContain('<a href="target.md"');
    });

    it('should convert links with curly single quotes (apostrophes) to buttons', () => {
      const choices = [
        { label: "Choice with \u2018curly apostrophe\u2019", targetId: 'target.md' }
      ];
      const markdown = "[Choice with \u2018curly apostrophe\u2019](target.md)";
      const html = md.render(markdown);
      
      const result = processScenarioLinks(html, choices);
      
      expect(result).toContain('<button class="scenario-choice"');
      expect(result).toContain('data-target="target.md"');
      expect(result).toContain('curly apostrophe');
      expect(result).not.toContain('<a href="target.md"');
    });

    it('should convert links with em dashes to buttons', () => {
      const choices = [
        { label: 'Choice with — em dash', targetId: 'target.md' }
      ];
      const markdown = `[Choice with — em dash](target.md)`;
      const html = md.render(markdown);
      
      const result = processScenarioLinks(html, choices);
      
      expect(result).toContain('<button class="scenario-choice"');
      expect(result).toContain('data-target="target.md"');
      expect(result).toContain('em dash');
      expect(result).not.toContain('<a href="target.md"');
    });

    it('should convert links with ellipsis to buttons', () => {
      const choices = [
        { label: 'Choice with … ellipsis', targetId: 'target.md' }
      ];
      const markdown = `[Choice with … ellipsis](target.md)`;
      const html = md.render(markdown);
      
      const result = processScenarioLinks(html, choices);
      
      expect(result).toContain('<button class="scenario-choice"');
      expect(result).toContain('data-target="target.md"');
      expect(result).toContain('ellipsis');
      expect(result).not.toContain('<a href="target.md"');
    });

    it('should handle complex real-world example with quotes and punctuation', () => {
      const choices = [
        { 
          label: "The Grovel: \u201COH MY GOSH I AM SO SORRY. Please forgive me, I am an idiot, I didn\u2019t mean it...\u201D", 
          targetId: 'ending-damage-control.md' 
        }
      ];
      const markdown = "[The Grovel: \u201COH MY GOSH I AM SO SORRY. Please forgive me, I am an idiot, I didn\u2019t mean it...\u201D](ending-damage-control.md)";
      const html = md.render(markdown);
      
      const result = processScenarioLinks(html, choices);
      
      expect(result).toContain('<button class="scenario-choice"');
      expect(result).toContain('data-target="ending-damage-control.md"');
      expect(result).toContain('OH MY GOSH');
      expect(result).not.toContain('<a href="ending-damage-control.md"');
    });

    it('should handle multiple links in the same HTML', () => {
      const choices = [
        { label: 'First choice', targetId: 'first.md' },
        { label: 'Second "choice"', targetId: 'second.md' }
      ];
      const markdown = `
[First choice](first.md)
[Second "choice"](second.md)
`;
      const html = md.render(markdown);
      
      const result = processScenarioLinks(html, choices);
      
      expect(result).toContain('data-target="first.md"');
      expect(result).toContain('data-target="second.md"');
      expect(result).not.toContain('<a href="first.md"');
      expect(result).not.toContain('<a href="second.md"');
    });

    it('should properly escape HTML entities in button labels', () => {
      const choices = [
        { label: 'Choice with <tags> & "quotes"', targetId: 'target.md' }
      ];
      const markdown = `[Choice with <tags> & "quotes"](target.md)`;
      const html = md.render(markdown);
      
      const result = processScenarioLinks(html, choices);
      
      expect(result).toContain('<button class="scenario-choice"');
      expect(result).toContain('&lt;tags&gt;');
      expect(result).toContain('&amp;');
      // With typographer enabled, straight quotes become curly quotes
      expect(result).toContain('\u201Cquotes\u201D');
      expect(result).not.toContain('<tags>');
    });
  });
});
