#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { buildCommand } from './commands/build.js';
import { previewCommand } from './commands/preview.js';
import { packageCommand } from './commands/package.js';
import { validateCommand } from './commands/validate.js';
import { newCommand } from './commands/new.js';
import { schemaCommand } from './commands/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf-8')
) as { version: string };

const program = new Command();

program
  .name('schorm')
  .description('A CLI-driven static-site generator for SCORM 2004 e-learning content')
  .version(packageJson.version);

// Register commands
program.addCommand(initCommand);
program.addCommand(newCommand);
program.addCommand(buildCommand);
program.addCommand(previewCommand);
program.addCommand(packageCommand);
program.addCommand(validateCommand);
program.addCommand(schemaCommand);

// Parse arguments
program.parse(process.argv);
