import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import MarkdownIt from 'markdown-it';
import {
  processScenarioLinks,
  buildScenarioGraph,
  detectCycles,
} from '../../src/core/scenario-builder.js';

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

  describe('buildScenarioGraph validation', () => {
    const writeScene = (dir: string, file: string, frontmatter: string, body = '') => {
      fs.writeFileSync(path.join(dir, file), `---\n${frontmatter}\n---\n\n${body}\n`);
    };

    let sceneDir: string;

    beforeEach(() => {
      sceneDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schorm-scenario-'));
    });

    afterEach(() => {
      fs.rmSync(sceneDir, { recursive: true, force: true });
    });

    it('accepts a valid mastery value', async () => {
      writeScene(sceneDir, 'start.md', 'id: start\ntitle: Start\nmodule: m1', '[Go](end.md)');
      writeScene(
        sceneDir,
        'end.md',
        'id: the-end\ntitle: End\nmodule: m1\nending: true\nmastery: 0.7'
      );
      const graph = await buildScenarioGraph(sceneDir, 'start.md');
      expect(graph.nodes.get('the-end')?.masteryScore).toBe(0.7);
    });

    it('rejects mastery outside 0..1', async () => {
      writeScene(
        sceneDir,
        'start.md',
        'id: start\ntitle: Start\nmodule: m1\nending: true\nmastery: 1.5'
      );
      await expect(buildScenarioGraph(sceneDir, 'start.md')).rejects.toThrow(
        /invalid mastery value "1\.5"/
      );
    });

    it('rejects non-numeric mastery', async () => {
      writeScene(
        sceneDir,
        'start.md',
        'id: start\ntitle: Start\nmodule: m1\nending: true\nmastery: high'
      );
      await expect(buildScenarioGraph(sceneDir, 'start.md')).rejects.toThrow(
        /invalid mastery value "high"/
      );
    });

    it('rejects scene ids with invalid characters at crawl time', async () => {
      writeScene(sceneDir, 'start.md', 'id: "bad id!"\ntitle: Start\nmodule: m1');
      await expect(buildScenarioGraph(sceneDir, 'start.md')).rejects.toThrow(/invalid id/);
    });
  });

  describe('detectCycles', () => {
    it('reports navigation loops', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schorm-cycles-'));
      try {
        fs.writeFileSync(
          path.join(dir, 'a.md'),
          '---\nid: a\ntitle: A\nmodule: m1\n---\n\n[To B](b.md)\n'
        );
        fs.writeFileSync(
          path.join(dir, 'b.md'),
          '---\nid: b\ntitle: B\nmodule: m1\n---\n\n[Back to A](a.md)\n'
        );
        const graph = await buildScenarioGraph(dir, 'a.md');
        const cycles = detectCycles(graph);
        expect(cycles.length).toBeGreaterThan(0);
        expect(cycles[0]).toContain('Cycle detected');
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('reports no cycles for an acyclic graph', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schorm-acyclic-'));
      try {
        fs.writeFileSync(
          path.join(dir, 'a.md'),
          '---\nid: a\ntitle: A\nmodule: m1\n---\n\n[To B](b.md)\n'
        );
        fs.writeFileSync(
          path.join(dir, 'b.md'),
          '---\nid: b\ntitle: B\nmodule: m1\nending: true\n---\n\nDone.\n'
        );
        const graph = await buildScenarioGraph(dir, 'a.md');
        expect(detectCycles(graph)).toEqual([]);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});
