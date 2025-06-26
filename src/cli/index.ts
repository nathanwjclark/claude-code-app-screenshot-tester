#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
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
  .command('capture [url]')
  .description('Capture screenshots of an application during loading')
  .option('-u, --url <url>', 'URL to capture')
  .option('-n, --name <name>', 'Name for the capture session')
  .option('-d, --duration <ms>', 'Maximum capture duration in milliseconds', '10000')
  .option('-i, --interval <ms>', 'Screenshot interval in milliseconds', '500')
  .option('-o, --output-dir <dir>', 'Output directory', '../.claude-screenshots')
  .option('--viewport <dimensions>', 'Viewport dimensions (e.g., 1280x720)', '1280x720')
  .option('--wait-for <selector>', 'CSS selector to wait for')
  .option('--key-frames-only', 'Only save key frame screenshots')
  .action((url, options) => {
    // Support both positional and flag-based URL
    const targetUrl = url || options.url || 'http://localhost:3000';
    captureCommand({ ...options, url: targetUrl });
  });

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

// Custom error handling
program.exitOverride();

try {
  program.parse();
} catch (err: any) {
  if (err.code === 'commander.unknownOption') {
    console.error(chalk.red('\nError: ' + err.message));
    console.error(chalk.yellow('\nDid you mean to use --url flag?'));
    console.error(chalk.gray('Example: npm run capture -- --url https://example.com'));
    console.error(chalk.gray('Or:      npm run capture -- https://example.com'));
    process.exit(1);
  } else if (err.code === 'commander.excessArguments') {
    console.error(chalk.red('\nError: Too many arguments provided'));
    console.error(chalk.yellow('\nCorrect usage:'));
    console.error(chalk.gray('  npm run capture -- --url https://example.com'));
    console.error(chalk.gray('  npm run capture -- https://example.com'));
    console.error(chalk.gray('\nRun with --help for more options'));
    process.exit(1);
  }
  throw err;
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}