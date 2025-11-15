#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { buildCommand } from './commands/build.js';
import { previewCommand } from './commands/preview.js';
import { packageCommand } from './commands/package.js';
import { validateCommand } from './commands/validate.js';
import { newCommand } from './commands/new.js';

const program = new Command();

program
  .name('schorm')
  .description('A CLI-driven static-site generator for SCORM 2004 e-learning content')
  .version('0.1.0');

// Register commands
program.addCommand(initCommand);
program.addCommand(newCommand);
program.addCommand(buildCommand);
program.addCommand(previewCommand);
program.addCommand(packageCommand);
program.addCommand(validateCommand);

// Parse arguments
program.parse(process.argv);
