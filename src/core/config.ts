/**
 * Configuration loading and management
 */

export interface SchormConfig {
  title: string;
  version: string;
  theme: string;
  outputDir: string;
  [key: string]: unknown;
}

export function loadConfig(configPath: string): SchormConfig {
  // TODO: Implement config loading from YAML
  console.log('Loading config from:', configPath);
  return {
    title: 'Untitled Course',
    version: '1.0.0',
    theme: 'default',
    outputDir: 'build',
  };
}

export function validateConfig(_config: SchormConfig): boolean {
  // TODO: Implement config validation
  return true;
}
