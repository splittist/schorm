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

export function loadConfig(configPath: string): SchormConfig {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  const config = yaml.parse(content) as SchormConfig;

  // Set defaults
  if (!config.scorm_version) {
    config.scorm_version = '2004-4th';
  }
  if (!config.theme) {
    config.theme = 'theme';
  }

  return config;
}

export function validateConfig(config: SchormConfig): boolean {
  if (!config.scorm_version) {
    return false;
  }
  if (!config.theme) {
    return false;
  }
  return true;
}
