import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, validateConfig, SUPPORTED_SCORM_VERSIONS } from '../../src/core/config.js';

const TEST_DIR = path.join(__dirname, '..', '..', 'test-output', 'config-test');

function writeConfig(contents: string): string {
  const configPath = path.join(TEST_DIR, 'schorm.config.yml');
  fs.writeFileSync(configPath, contents);
  return configPath;
}

describe('config loading', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('loads a valid config', () => {
    const configPath = writeConfig("scorm_version: '2004-4th'\ntheme: theme\n");
    const config = loadConfig(configPath);
    expect(config.scorm_version).toBe('2004-4th');
    expect(config.theme).toBe('theme');
  });

  it('applies defaults for missing fields', () => {
    const configPath = writeConfig('# empty config\n');
    const config = loadConfig(configPath);
    expect(config.scorm_version).toBe('2004-4th');
    expect(config.theme).toBe('theme');
  });

  it('throws for a missing config file', () => {
    expect(() => loadConfig(path.join(TEST_DIR, 'nope.yml'))).toThrow(/Config file not found/);
  });

  it('rejects unsupported scorm_version values instead of silently ignoring them', () => {
    const configPath = writeConfig("scorm_version: '1.2'\ntheme: theme\n");
    expect(() => loadConfig(configPath)).toThrow(/Unsupported scorm_version "1\.2"/);
  });

  it('names the supported versions in the rejection message', () => {
    const configPath = writeConfig("scorm_version: '2004-3rd'\ntheme: theme\n");
    expect(() => loadConfig(configPath)).toThrow(new RegExp(SUPPORTED_SCORM_VERSIONS[0]));
  });

  it('preserves extra keys', () => {
    const configPath = writeConfig("scorm_version: '2004-4th'\ntheme: theme\ncustom_key: 42\n");
    const config = loadConfig(configPath);
    expect(config.custom_key).toBe(42);
  });
});

describe('validateConfig', () => {
  it('accepts every supported scorm version', () => {
    for (const version of SUPPORTED_SCORM_VERSIONS) {
      expect(() => validateConfig({ scorm_version: version, theme: 'theme' })).not.toThrow();
    }
  });

  it('rejects an empty theme', () => {
    expect(() => validateConfig({ scorm_version: '2004-4th', theme: '  ' })).toThrow(/theme/);
  });
});
