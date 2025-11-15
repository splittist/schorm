import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface InitOptions {
  title?: string;
  scormVersion?: string;
  force?: boolean;
}

/**
 * Copy directory recursively
 */
function copyDirRecursive(src: string, dest: string): void {
  // Create destination directory
  fs.mkdirSync(dest, { recursive: true });

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Initialize a new SCORM project
 */
function initializeProject(projectName: string, options: InitOptions): void {
  const projectPath = path.resolve(process.cwd(), projectName);
  const scormVersion = options.scormVersion || '2004-4th';
  const title = options.title || projectName;

  // Check if directory exists
  if (fs.existsSync(projectPath)) {
    if (!options.force) {
      console.error(`Error: Directory "${projectName}" already exists.`);
      console.error('Use --force to overwrite.');
      process.exit(1);
    }
  }

  try {
    // Create project directory
    fs.mkdirSync(projectPath, { recursive: true });

    // Create subdirectories
    const directories = ['content', 'quizzes', 'media'];
    for (const dir of directories) {
      fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
    }

    // Generate schorm.config.yml
    const schormConfig = {
      scorm_version: scormVersion,
      theme: 'theme',
    };
    const schormConfigPath = path.join(projectPath, 'schorm.config.yml');
    fs.writeFileSync(schormConfigPath, yaml.stringify(schormConfig));

    // Generate course.yml
    const courseConfig = {
      id: projectName,
      title: title,
      modules: [],
    };
    const courseConfigPath = path.join(projectPath, 'course.yml');
    fs.writeFileSync(courseConfigPath, yaml.stringify(courseConfig));

    // Copy theme-default to theme/
    // Find theme-default directory (should be in package root)
    const packageRoot = path.resolve(__dirname, '..', '..');
    const themeDefaultPath = path.join(packageRoot, 'theme-default');

    if (!fs.existsSync(themeDefaultPath)) {
      console.error('Error: theme-default directory not found.');
      console.error(`Expected location: ${themeDefaultPath}`);
      process.exit(1);
    }

    const themeDestPath = path.join(projectPath, 'theme');
    copyDirRecursive(themeDefaultPath, themeDestPath);

    console.log(`✓ Created project "${projectName}"`);
    console.log(`  - schorm.config.yml`);
    console.log(`  - course.yml`);
    console.log(`  - content/`);
    console.log(`  - quizzes/`);
    console.log(`  - media/`);
    console.log(`  - theme/`);
    console.log('');
    console.log('Next steps:');
    console.log(`  cd ${projectName}`);
    console.log('  schorm new module m1 "Introduction"');
    console.log('  schorm build');
  } catch (error) {
    console.error('Error initializing project:', error);
    process.exit(1);
  }
}

export const initCommand = new Command('init')
  .description('Initialize a new SCORM project')
  .argument('<project-name>', 'Name of the project')
  .option('--title <title>', 'Course title (defaults to project name)')
  .option('--scorm-version <version>', 'SCORM version', '2004-4th')
  .option('--force', 'Overwrite existing directory', false)
  .action((projectName: string, options: InitOptions) => {
    initializeProject(projectName, options);
  });
