import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, '..', 'src', 'cli', 'index.ts');

describe('Integration Tests', () => {
  const testOutputDir = path.join(__dirname, '..', 'test-screenshots');

  beforeEach(async () => {
    // Clean up test output directory
    try {
      await fs.rm(testOutputDir, { recursive: true });
    } catch {
      // Directory might not exist
    }
  });

  afterEach(async () => {
    // Clean up after tests
    try {
      await fs.rm(testOutputDir, { recursive: true });
    } catch {
      // Directory might not exist
    }
  });

  it('should capture screenshots of a real website', async () => {
    // This test actually captures screenshots of example.com
    const output = execSync(
      `npx tsx ${cliPath} capture --url https://example.com --name integration-test --duration 3000 --interval 1000 --output-dir ${testOutputDir}`,
      { encoding: 'utf-8' }
    );

    // Check output contains expected messages
    expect(output).toContain('Starting capture for https://example.com');
    expect(output).toContain('Browser launched successfully');
    expect(output).toContain('Capture completed:');
    expect(output).toContain('Screenshots:');

    // Check that files were created
    const captures = await fs.readdir(testOutputDir);
    expect(captures.length).toBeGreaterThan(0);

    // Find the capture directory
    const captureDir = captures.find(dir => dir.startsWith('integration-test-'));
    expect(captureDir).toBeDefined();

    // Check manifest exists
    const manifestPath = path.join(testOutputDir, captureDir!, 'manifest.json');
    const manifestData = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestData);

    expect(manifest.metadata.url).toBe('https://example.com');
    expect(manifest.screenshots.length).toBeGreaterThan(0);
    expect(manifest.screenshots[0].phase).toBe('initial');
    expect(manifest.screenshots[manifest.screenshots.length - 1].phase).toBe('final');

    // Check screenshot files exist
    for (const screenshot of manifest.screenshots) {
      const screenshotPath = path.join(testOutputDir, captureDir!, screenshot.filename);
      const stats = await fs.stat(screenshotPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    }
  }, 30000); // 30 second timeout for integration test

  it('should analyze a capture directory', async () => {
    // First create a capture
    execSync(
      `npx tsx ${cliPath} capture --url https://example.com --name analyze-test --duration 2000 --output-dir ${testOutputDir}`,
      { encoding: 'utf-8' }
    );

    // Find the capture directory
    const captures = await fs.readdir(testOutputDir);
    const captureDir = captures.find(dir => dir.startsWith('analyze-test-'));
    const fullCapturePath = path.join(testOutputDir, captureDir!);

    // Run analyze command
    const analyzeOutput = execSync(
      `npx tsx ${cliPath} analyze ${fullCapturePath}`,
      { encoding: 'utf-8' }
    );

    expect(analyzeOutput).toContain('Analyzing capture:');
    expect(analyzeOutput).toContain('Capture ID:');
    expect(analyzeOutput).toContain('URL: https://example.com');
    expect(analyzeOutput).toContain('Screenshots:');
    expect(analyzeOutput).toContain('Loading duration:');
    expect(analyzeOutput).toContain('Analysis complete');
  }, 20000);

  it('should handle errors gracefully', () => {
    // Test with invalid URL
    try {
      execSync(
        `npx tsx ${cliPath} capture --url invalid-url --duration 1000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      // Should fail with error
      const output = error.stdout || error.stderr || error.toString();
      expect(output).toContain('Failed');
    }
  });
});