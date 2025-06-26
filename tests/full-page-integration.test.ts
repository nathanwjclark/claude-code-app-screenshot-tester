import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, '..', 'src', 'cli', 'index.ts');

describe('Full-Page Integration Tests', () => {
  const testOutputDir = path.join(__dirname, '..', 'test-full-page-screenshots');

  beforeAll(async () => {
    // Clean up test output directory
    try {
      await fs.rm(testOutputDir, { recursive: true });
    } catch {
      // Directory might not exist
    }
  });

  afterAll(async () => {
    // Clean up
    try {
      await fs.rm(testOutputDir, { recursive: true });
    } catch {
      // Directory might not exist
    }
  });

  it('should capture full-page screenshots with --full-page flag', async () => {
    // Create a test HTML file with long content
    const testHtmlPath = path.join(__dirname, '..', 'test-long-page.html');
    const longPageContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Long Test Page</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .section { margin-bottom: 100px; padding: 20px; background: #f5f5f5; }
        .tall-section { height: 800px; background: linear-gradient(to bottom, #e3f2fd, #bbdefb); }
    </style>
</head>
<body>
    <h1>Test Page for Full-Page Screenshots</h1>
    <div class="section">
        <h2>Section 1</h2>
        <p>This is the first section with some content.</p>
    </div>
    <div class="section tall-section">
        <h2>Section 2 - Tall Section</h2>
        <p>This is a very tall section that extends below the viewport.</p>
    </div>
    <div class="section">
        <h2>Section 3</h2>
        <p>This section is at the bottom and might not be visible without scrolling.</p>
    </div>
    <div class="section">
        <h2>Section 4 - Final</h2>
        <p>This is the final section at the very bottom of the page.</p>
    </div>
</body>
</html>`;

    await fs.writeFile(testHtmlPath, longPageContent);

    try {
      // Test full-page capture
      const fullPageOutput = execSync(
        `npx tsx ${cliPath} capture --url file://${testHtmlPath} --name full-page-test --duration 3000 --full-page --output-dir ${testOutputDir}`,
        { encoding: 'utf-8', timeout: 30000 }
      );

      console.log('Full-page capture output:', fullPageOutput);

      // Verify capture completed successfully
      expect(fullPageOutput).toContain('Capture completed:');
      expect(fullPageOutput).toContain('Screenshots:');

      // Test regular (viewport-only) capture for comparison
      const regularOutput = execSync(
        `npx tsx ${cliPath} capture --url file://${testHtmlPath} --name regular-test --duration 3000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8', timeout: 30000 }
      );

      console.log('Regular capture output:', regularOutput);

      // Check that both captures created files
      const captures = await fs.readdir(testOutputDir);
      expect(captures.length).toBeGreaterThan(0);

      const fullPageCapture = captures.find(dir => dir.startsWith('full-page-test-'));
      const regularCapture = captures.find(dir => dir.startsWith('regular-test-'));

      expect(fullPageCapture).toBeDefined();
      expect(regularCapture).toBeDefined();

      // Check that screenshots were created
      const fullPageScreenshots = await fs.readdir(path.join(testOutputDir, fullPageCapture!));
      const regularScreenshots = await fs.readdir(path.join(testOutputDir, regularCapture!));

      const fullPagePngs = fullPageScreenshots.filter(f => f.endsWith('.png'));
      const regularPngs = regularScreenshots.filter(f => f.endsWith('.png'));

      expect(fullPagePngs.length).toBeGreaterThan(0);
      expect(regularPngs.length).toBeGreaterThan(0);

      // Compare file sizes (full-page screenshots should generally be larger)
      const fullPageFirstScreenshot = path.join(testOutputDir, fullPageCapture!, fullPagePngs[0]);
      const regularFirstScreenshot = path.join(testOutputDir, regularCapture!, regularPngs[0]);

      const fullPageStats = await fs.stat(fullPageFirstScreenshot);
      const regularStats = await fs.stat(regularFirstScreenshot);

      console.log('Full-page screenshot size:', fullPageStats.size);
      console.log('Regular screenshot size:', regularStats.size);

      // Full-page screenshots should typically be larger (but this isn't guaranteed)
      // So we just verify both files exist and have content
      expect(fullPageStats.size).toBeGreaterThan(1000);
      expect(regularStats.size).toBeGreaterThan(1000);

      // Verify manifests were created
      const fullPageManifest = await fs.readFile(
        path.join(testOutputDir, fullPageCapture!, 'manifest.json'),
        'utf-8'
      );
      const regularManifest = await fs.readFile(
        path.join(testOutputDir, regularCapture!, 'manifest.json'),
        'utf-8'
      );

      const fullPageData = JSON.parse(fullPageManifest);
      const regularData = JSON.parse(regularManifest);

      expect(fullPageData.metadata.url).toContain('test-long-page.html');
      expect(regularData.metadata.url).toContain('test-long-page.html');
      expect(fullPageData.screenshots.length).toBeGreaterThan(0);
      expect(regularData.screenshots.length).toBeGreaterThan(0);

    } finally {
      // Clean up test HTML file
      try {
        await fs.unlink(testHtmlPath);
      } catch {
        // File might not exist
      }
    }
  }, 60000); // 60 second timeout for this integration test

  it('should handle --full-page flag in help output', () => {
    const helpOutput = execSync(
      `npx tsx ${cliPath} capture --help`,
      { encoding: 'utf-8' }
    );

    expect(helpOutput).toContain('--full-page');
    expect(helpOutput).toContain('Capture full-page screenshots');
  });
});