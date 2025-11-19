/**
 * Build error types and formatting
 */

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
    if (summary.outputDir) {
      lines.push(`   Output: ${summary.outputDir}`);
    }
  }

  return lines.join('\n');
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
