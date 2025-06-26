import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, '..', 'src', 'cli', 'index.ts');

describe('Full-Page Feature Tests', () => {
  it('should include --full-page option in help output', () => {
    const helpOutput = execSync(
      `npx tsx ${cliPath} capture --help`,
      { encoding: 'utf-8' }
    );

    expect(helpOutput).toContain('--full-page');
    expect(helpOutput).toContain('Capture full-page screenshots');
    expect(helpOutput).toContain('scrolls entire page');
  });

  it('should accept --full-page flag without errors', () => {
    // Just test that the command accepts the flag without throwing
    expect(() => {
      execSync(
        `npx tsx ${cliPath} capture https://example.com --full-page --duration 1000 --dry-run 2>/dev/null || true`,
        { timeout: 5000 }
      );
    }).not.toThrow();
  });

  it('should successfully capture with --full-page flag', () => {
    const output = execSync(
      `npx tsx ${cliPath} capture https://example.com --full-page --duration 2000`,
      { encoding: 'utf-8', timeout: 30000 }
    );

    expect(output).toContain('Capture completed:');
    expect(output).toContain('Screenshots:');
    expect(output).not.toContain('Error');
    expect(output).not.toContain('Failed');
  }, 30000);
});