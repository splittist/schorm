import { Command } from 'commander';

export const previewCommand = new Command('preview')
  .description('Start a local preview server')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('-o, --open', 'Open browser automatically')
  .option('-d, --dir <directory>', 'Directory to serve', 'build')
  .action((options) => {
    console.log('schorm preview command');
    console.log('Port:', options.port);
    console.log('Directory:', options.dir);
    console.log('Open browser:', options.open || false);
    console.log('TODO: Implement preview server');
  });
