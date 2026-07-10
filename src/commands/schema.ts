import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Map of schema names to their files in the package's schemas/ directory.
 * The names are what authors (and LLM prompts) refer to; the files are the
 * single source of truth shipped with the package.
 */
const SCHEMAS: Record<string, { file: string; describes: string }> = {
  quiz: {
    file: 'quiz-schema.json',
    describes: 'Quiz YAML files (quizzes/**.yml)',
  },
  course: {
    file: 'course-schema.json',
    describes: 'course.yml, including the sequencing/branching DSL',
  },
  lesson: {
    file: 'lesson-frontmatter-schema.json',
    describes: 'YAML frontmatter of lesson markdown files',
  },
  config: {
    file: 'config-schema.json',
    describes: 'schorm.config.yml',
  },
};

function schemasDir(): string {
  const packageRoot = path.resolve(__dirname, '..', '..');
  return path.join(packageRoot, 'schemas');
}

function listSchemas(): void {
  console.log('Available schemas:\n');
  for (const [name, info] of Object.entries(SCHEMAS)) {
    console.log(`  ${name.padEnd(8)} ${info.describes}`);
  }
  console.log('\nPrint one with: schorm schema <name>');
}

export const schemaCommand = new Command('schema')
  .description('Print a JSON schema for quiz, course, lesson frontmatter, or config files')
  .argument('[name]', 'Schema to print (quiz, course, lesson, config); omit to list')
  .action((name?: string) => {
    if (!name) {
      listSchemas();
      return;
    }

    const schema = SCHEMAS[name];
    if (!schema) {
      console.error(`Error: Unknown schema "${name}".`);
      console.error(`Valid names: ${Object.keys(SCHEMAS).join(', ')}`);
      process.exit(1);
    }

    const schemaPath = path.join(schemasDir(), schema.file);
    if (!fs.existsSync(schemaPath)) {
      console.error(`Error: Schema file not found: ${schemaPath}`);
      process.exit(1);
    }

    // Print the raw file so output is valid JSON, pipeable into prompts/tools
    process.stdout.write(fs.readFileSync(schemaPath, 'utf-8'));
  });
