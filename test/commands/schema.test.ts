import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { execSync } from 'child_process';

const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'schorm');

describe('schorm schema command', () => {
  it('lists available schemas when no name is given', () => {
    const output = execSync(`${CLI_PATH} schema`, { encoding: 'utf-8' });
    expect(output).toContain('quiz');
    expect(output).toContain('course');
    expect(output).toContain('lesson');
    expect(output).toContain('config');
  });

  for (const name of ['quiz', 'course', 'lesson', 'config']) {
    it(`prints valid JSON for "${name}"`, () => {
      const output = execSync(`${CLI_PATH} schema ${name}`, { encoding: 'utf-8' });
      const schema = JSON.parse(output);
      expect(schema.$id).toMatch(/^https:\/\//);
      expect(schema.$schema).toContain('json-schema.org');
    });
  }

  it('quiz schema output includes passing_score', () => {
    const output = execSync(`${CLI_PATH} schema quiz`, { encoding: 'utf-8' });
    const schema = JSON.parse(output);
    expect(schema.properties.passing_score).toBeDefined();
  });

  it('fails with a helpful message for unknown schema names', () => {
    expect(() => {
      execSync(`${CLI_PATH} schema bogus`, { stdio: 'pipe' });
    }).toThrow(/Unknown schema/);
  });
});
