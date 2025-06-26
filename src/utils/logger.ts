import chalk from 'chalk';

export class Logger {
  private static formatTimestamp(): string {
    return new Date().toISOString().split('T')[1].split('.')[0];
  }

  static info(category: string, message: string): void {
    console.log(
      chalk.gray(`[${this.formatTimestamp()}]`) +
      chalk.cyan(` [${category}] `) +
      message
    );
  }

  static success(category: string, message: string): void {
    console.log(
      chalk.gray(`[${this.formatTimestamp()}]`) +
      chalk.green(` [${category}] `) +
      message
    );
  }

  static error(category: string, message: string): void {
    console.error(
      chalk.gray(`[${this.formatTimestamp()}]`) +
      chalk.red(` [${category}] `) +
      message
    );
  }

  static warn(category: string, message: string): void {
    console.warn(
      chalk.gray(`[${this.formatTimestamp()}]`) +
      chalk.yellow(` [${category}] `) +
      message
    );
  }
}