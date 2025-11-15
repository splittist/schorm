import { Command } from 'commander';

export const packageCommand = new Command('package')
  .description('Package the built SCORM content into a ZIP file')
  .option('-o, --output <file>', 'Output ZIP file name', 'course.zip')
  .option('-d, --dir <directory>', 'Directory to package', 'build')
  .action((options) => {
    console.log('schorm package command');
    console.log('Output file:', options.output);
    console.log('Directory:', options.dir);
    console.log('TODO: Implement ZIP packaging');
  });
