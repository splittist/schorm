import { Command } from 'commander';
import { validateProject } from '../core/validator.js';
import type { ValidationIssue } from '../core/validator.js';

export const validateCommand = new Command('validate')
  .description('Validate project structure and references')
  .option('--json', 'Output machine-readable JSON')
  .action(async (options) => {
    try {
      const projectRoot = process.cwd();
      const result = await validateProject(projectRoot);

      if (options.json) {
        // JSON output mode
        console.log(JSON.stringify(result, null, 2));
      } else {
        // Human-readable output mode
        console.log('🔍 Validating schorm project...\n');

        if (result.errors.length > 0) {
          console.log('❌ Errors found:\n');
          for (const issue of result.errors) {
            printIssue(issue);
          }
        }

        if (result.warnings.length > 0) {
          console.log('\n⚠️  Warnings:\n');
          for (const issue of result.warnings) {
            printIssue(issue);
          }
        }

        if (result.ok) {
          console.log('✅ Validation passed! No errors found.');
          if (result.warnings.length > 0) {
            console.log(
              `\n${result.warnings.length} warning(s) - these are informational and do not prevent building.`
            );
          }
        } else {
          console.log(`\n❌ Validation failed with ${result.errors.length} error(s).`);
        }
      }

      // Exit with appropriate code
      process.exit(result.ok ? 0 : 1);
    } catch (error) {
      console.error('❌ Validation error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Print a validation issue in human-readable format
 */
function printIssue(issue: ValidationIssue): void {
  const prefix = issue.severity === 'error' ? '  ❌' : '  ⚠️ ';
  console.log(`${prefix} [${issue.code}] ${issue.message}`);

  // Print additional context if available
  const details: string[] = [];
  if (issue.file) details.push(`file: ${issue.file}`);
  if (issue.moduleId) details.push(`module: ${issue.moduleId}`);
  if (issue.scoId) details.push(`sco: ${issue.scoId}`);
  if (issue.itemId) details.push(`item: ${issue.itemId}`);
  if (issue.path) details.push(`path: ${issue.path}`);

  if (details.length > 0) {
    console.log(`     ${details.join(', ')}`);
  }
}
