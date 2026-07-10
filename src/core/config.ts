/**
 * Configuration loading and management
 */

import * as fs from 'fs';
import * as yaml from 'yaml';

export interface SchormConfig {
  scorm_version: string;
  theme: string;
  [key: string]: unknown;
}

/**
 * SCORM versions the generator can actually produce. The manifest builder
 * emits SCORM 2004 4th Edition; other values would silently produce a
 * package that doesn't match the requested standard, so they are rejected.
 */
export const SUPPORTED_SCORM_VERSIONS = ['2004-4th'] as const;

export function loadConfig(configPath: string): SchormConfig {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  const config = (yaml.parse(content) ?? {}) as SchormConfig;

  // Set defaults
  if (!config.scorm_version) {
    config.scorm_version = '2004-4th';
  }
  if (!config.theme) {
    config.theme = 'theme';
  }

  validateConfig(config);

  return config;
}

/**
 * Validate a loaded configuration, throwing with an actionable message on
 * unsupported values.
 */
export function validateConfig(config: SchormConfig): void {
  if (typeof config.scorm_version !== 'string') {
    throw new Error('Invalid schorm.config.yml: scorm_version must be a string');
  }
  if (!(SUPPORTED_SCORM_VERSIONS as readonly string[]).includes(config.scorm_version)) {
    throw new Error(
      `Unsupported scorm_version "${config.scorm_version}". ` +
        `Supported values: ${SUPPORTED_SCORM_VERSIONS.join(', ')} ` +
        '(schorm currently generates SCORM 2004 4th Edition packages only).'
    );
  }
  if (typeof config.theme !== 'string' || config.theme.trim() === '') {
    throw new Error('Invalid schorm.config.yml: theme must be a non-empty string path');
  }
}
