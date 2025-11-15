import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { startPreviewServer } from '../server/preview-server.js';

export const previewCommand = new Command('preview')
  .description('Start a local preview server with mock SCORM API')
  .option('-p, --port <port>', 'Port to listen on', '4173')
  .option('-o, --open', 'Open browser automatically', false)
  .option('-d, --dir <directory>', 'Directory to serve', 'build')
  .action(async (options) => {
    try {
      const buildDir = path.resolve(options.dir);

      // Check if build directory exists
      if (!fs.existsSync(buildDir)) {
        console.error(`❌ Build directory not found: ${buildDir}`);
        console.error('\nPlease run "schorm build" first to create the build directory.');
        process.exit(1);
      }

      // Check if there are any HTML files in the build directory
      const files = fs.readdirSync(buildDir);
      const hasHtmlFiles = files.some((file) => file.endsWith('.html'));

      if (!hasHtmlFiles) {
        console.error(`❌ No HTML files found in: ${buildDir}`);
        console.error('\nPlease run "schorm build" first to generate course content.');
        process.exit(1);
      }

      const port = parseInt(options.port, 10);

      console.log('🚀 Starting preview server...');

      await startPreviewServer({
        port,
        directory: buildDir,
        open: options.open,
      });

      // Keep the process running
      console.log('Press Ctrl+C to stop the server');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        console.error(`❌ Port ${options.port} is already in use.`);
        console.error('   Try using a different port with --port <number>');
      } else {
        console.error(
          '❌ Failed to start preview server:',
          error instanceof Error ? error.message : error
        );
      }
      process.exit(1);
    }
  });
