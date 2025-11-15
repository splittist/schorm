import { Command } from 'commander';

export const validateCommand = new Command('validate')
  .description('Validate SCORM package structure and manifest')
  .option('-d, --dir <directory>', 'Directory to validate', 'build')
  .option('--strict', 'Enable strict validation')
  .action((options) => {
    console.log('schorm validate command');
    console.log('Directory:', options.dir);
    console.log('Strict mode:', options.strict || false);
    console.log('TODO: Implement validation');
  });
