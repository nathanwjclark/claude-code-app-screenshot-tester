import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, '..', 'src', 'cli', 'index.ts');

describe('CLI Basic Functionality', () => {
  it('should display help when no arguments provided', () => {
    try {
      execSync(`npx tsx ${cliPath}`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (error: any) {
      const output = error.stdout || error.stderr || '';
      expect(output).toContain('Usage: app-screenshot-tester');
      expect(output).toContain('capture');
      expect(output).toContain('analyze');
    }
  });

  it('should display version', () => {
    const output = execSync(`npx tsx ${cliPath} --version`, { encoding: 'utf-8' });
    expect(output.trim()).toBe('1.0.0');
  });

  it('should display capture command help', () => {
    const output = execSync(`npx tsx ${cliPath} capture --help`, { encoding: 'utf-8' });
    expect(output).toContain('--url');
    expect(output).toContain('--name');
    expect(output).toContain('--duration');
    expect(output).toContain('--interval');
    expect(output).toContain('--viewport');
  });
});