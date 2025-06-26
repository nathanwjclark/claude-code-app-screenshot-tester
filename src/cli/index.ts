#!/usr/bin/env node

import { Command } from 'commander';
import { Logger } from '../utils/logger.js';
import { captureCommand } from './commands/capture.js';
import { analyzeCommand } from './commands/analyze.js';
import { testCommand } from './commands/test.js';
import { compareCommand } from './commands/compare.js';
import { baselineCommand } from './commands/baseline.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('app-screenshot-tester')
  .description('Capture and analyze web application loading screenshots')
  .version('1.0.0');

program
  .command('capture')
  .description('Capture screenshots of an application during loading')
  .option('-u, --url <url>', 'URL to capture', 'http://localhost:3000')
  .option('-n, --name <name>', 'Name for the capture session')
  .option('-d, --duration <ms>', 'Maximum capture duration in milliseconds', '10000')
  .option('-i, --interval <ms>', 'Screenshot interval in milliseconds', '500')
  .option('-o, --output-dir <dir>', 'Output directory', '../.claude-screenshots')
  .option('--viewport <dimensions>', 'Viewport dimensions (e.g., 1280x720)', '1280x720')
  .option('--wait-for <selector>', 'CSS selector to wait for')
  .option('--key-frames-only', 'Only save key frame screenshots')
  .action(captureCommand);

program
  .command('analyze <capture-dir>')
  .description('Analyze a capture session')
  .action(analyzeCommand);

program
  .command('test')
  .description('Start an application and capture screenshots')
  .requiredOption('-s, --start-command <cmd>', 'Command to start the application')
  .requiredOption('-u, --url <url>', 'URL to capture after app starts')
  .option('-w, --wait-before-capture <ms>', 'Time to wait before capture (ms)', '3000')
  .option('-d, --duration <ms>', 'Maximum capture duration in milliseconds', '10000')
  .option('-i, --interval <ms>', 'Screenshot interval in milliseconds', '500')
  .option('-o, --output-dir <dir>', 'Output directory', '../.claude-screenshots')
  .option('--viewport <dimensions>', 'Viewport dimensions (e.g., 1280x720)', '1280x720')
  .option('-p, --port <port>', 'Port to check for in app output')
  .action(testCommand);

program
  .command('compare <current-dir> <baseline-dir>')
  .description('Compare current screenshots with baseline')
  .option('-t, --threshold <percent>', 'Difference threshold percentage', '0.1')
  .option('--pixel-threshold <value>', 'Per-pixel difference threshold (0-255)', '10')
  .action(compareCommand);

program
  .command('baseline <capture-dir>')
  .description('Create baseline from a capture directory')
  .option('-o, --output <dir>', 'Baseline output directory', './baselines')
  .action(baselineCommand);

program
  .command('config')
  .description('Manage configuration files')
  .option('--init', 'Create a sample configuration file')
  .option('--validate [file]', 'Validate configuration file')
  .action(configCommand);

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}