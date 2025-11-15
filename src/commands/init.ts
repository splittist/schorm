import { Command } from 'commander';

export const initCommand = new Command('init')
  .description('Initialize a new SCORM project')
  .argument('[project-name]', 'Name of the project')
  .option('-t, --template <template>', 'Template to use', 'default')
  .action((projectName, options) => {
    console.log('schorm init command');
    console.log('Project name:', projectName || 'current directory');
    console.log('Template:', options.template);
    console.log('TODO: Implement project initialization');
  });
