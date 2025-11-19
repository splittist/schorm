/**
 * Build error types and formatting
 */

import * as fs from 'fs';
import * as path from 'path';

export interface BuildError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  file?: string;
  scoId?: string;
  moduleId?: string;
  originatingStep?: string;
}

export interface BuildResult {
  ok: boolean;
  errors: BuildError[];
  warnings: BuildError[];
  summary?: {
    modules?: number;
    lessons?: number;
    media?: number;
    outputDir?: string;
    outputSize?: number;
  };
}

/**
 * Create a BuildError instance
 */
export function createBuildError(
  code: string,
  message: string,
  options?: {
    file?: string;
    scoId?: string;
    moduleId?: string;
    originatingStep?: string;
    severity?: 'error' | 'warning';
  }
): BuildError {
  return {
    code,
    message,
    severity: options?.severity || 'error',
    file: options?.file,
    scoId: options?.scoId,
    moduleId: options?.moduleId,
    originatingStep: options?.originatingStep,
  };
}

/**
 * Format errors for human-readable output
 */
export function formatErrorsForHuman(errors: BuildError[], warnings: BuildError[]): string {
  const lines: string[] = [];

  if (errors.length > 0) {
    lines.push(`Build failed with ${errors.length} error(s):\n`);

    for (const error of errors) {
      lines.push(`[${error.code}] ${error.file || '(unknown file)'}`);
      lines.push(`  ${error.message}`);
      if (error.scoId) {
        lines.push(`  SCO: ${error.scoId}`);
      }
      if (error.moduleId) {
        lines.push(`  Module: ${error.moduleId}`);
      }
      lines.push('');
    }
  }

  if (warnings.length > 0) {
    lines.push(`\n${warnings.length} warning(s):\n`);

    for (const warning of warnings) {
      lines.push(`[${warning.code}] ${warning.file || '(unknown file)'}`);
      lines.push(`  ${warning.message}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format build result as JSON
 */
export function formatBuildResultAsJson(result: BuildResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Format success message for human-readable output
 */
export function formatSuccessMessage(summary: BuildResult['summary']): string {
  const lines: string[] = [];
  lines.push('✅ Build completed successfully!\n');

  if (summary) {
    if (summary.modules !== undefined) {
      lines.push(`   Modules: ${summary.modules}`);
    }
    if (summary.lessons !== undefined) {
      lines.push(`   Lessons: ${summary.lessons}`);
    }
    if (summary.media !== undefined) {
      lines.push(`   Media files: ${summary.media}`);
    }
    if (summary.outputSize !== undefined) {
      lines.push(`   Output size: ${formatBytes(summary.outputSize)}`);
    }
    if (summary.outputDir) {
      lines.push(`   Output: ${summary.outputDir}`);
    }
  }

  return lines.join('\n');
}

/**
 * Calculate the total size of a directory recursively
 */
export function calculateDirectorySize(dirPath: string): number {
  let totalSize = 0;

  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      totalSize += calculateDirectorySize(fullPath);
    } else if (entry.isFile()) {
      const stats = fs.statSync(fullPath);
      totalSize += stats.size;
    }
  }

  return totalSize;
}

/**
 * Format bytes in human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  
  // Format with appropriate decimal places
  if (i === 0) {
    return `${bytes} B`;
  } else {
    return `${value.toFixed(2)} ${units[i]}`;
  }
}

/**
 * Wrap an error with BuildError context
 */
export function wrapError(
  error: unknown,
  code: string,
  defaultMessage: string,
  options?: {
    file?: string;
    scoId?: string;
    moduleId?: string;
    originatingStep?: string;
  }
): BuildError {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return createBuildError(code, `${defaultMessage}: ${errorMessage}`, options);
}
