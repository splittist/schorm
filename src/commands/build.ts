import { Command } from 'commander';

export const buildCommand = new Command('build')
  .description('Build the SCORM package from source content')
  .option('-o, --output <dir>', 'Output directory', 'build')
  .option('-c, --config <file>', 'Config file path', 'schorm.config.yml')
  .action((options) => {
    console.log('schorm build command');
    console.log('Output directory:', options.output);
    console.log('Config file:', options.config);
    console.log('TODO: Implement build process');
  });
