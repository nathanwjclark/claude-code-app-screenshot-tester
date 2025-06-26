import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, '..', 'src', 'cli', 'index.ts');

describe('Edge Case Tests', () => {
  const testOutputDir = path.join(__dirname, '..', 'test-edge-cases');

  beforeEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true });
    } catch {
      // Directory might not exist
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true });
    } catch {
      // Directory might not exist
    }
  });

  describe('Network Conditions', () => {
    it('should handle extremely slow connections', async () => {
      // TODO: Implement network throttling test when supported
      // For now, test with a slow-loading endpoint
      const output = execSync(
        `npx tsx ${cliPath} capture --url https://httpstat.us/200?sleep=3000 --name slow-network --duration 5000 --interval 1000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Capture completed');
      
      const captures = await fs.readdir(testOutputDir);
      const captureDir = captures.find(dir => dir.startsWith('slow-network-'));
      const manifestPath = path.join(testOutputDir, captureDir!, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

      // Should capture multiple states during slow load
      expect(manifest.screenshots.length).toBeGreaterThan(3);
    }, 30000);

    it('should handle intermittent network failures', async () => {
      // Test with a URL that returns different status codes
      const output = execSync(
        `npx tsx ${cliPath} capture --url https://httpstat.us/Random/200,500,503 --name intermittent --duration 3000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Capture completed');
    }, 20000);
  });

  describe('Extreme Page Sizes', () => {
    it('should handle pages with thousands of elements', async () => {
      // Create a page with many elements
      const largePageHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Large Page Test</title></head>
        <body>
          <h1>Large Page with Many Elements</h1>
          ${Array(1000).fill(0).map((_, i) => `
            <div id="element-${i}" style="padding: 5px; margin: 2px; border: 1px solid #ccc;">
              <span>Element ${i}</span>
              <button>Button ${i}</button>
              <input type="text" placeholder="Input ${i}">
            </div>
          `).join('')}
        </body>
        </html>
      `;

      const testPagePath = path.join(testOutputDir, 'large-page.html');
      await fs.mkdir(testOutputDir, { recursive: true });
      await fs.writeFile(testPagePath, largePageHtml);

      const output = execSync(
        `npx tsx ${cliPath} capture --url file://${testPagePath} --name large-page --duration 3000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Capture completed');
      
      const captures = await fs.readdir(testOutputDir);
      const captureDir = captures.find(dir => dir.startsWith('large-page-'));
      const manifestPath = path.join(testOutputDir, captureDir!, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

      // Analysis should detect many elements
      const screenshots = manifest.screenshots;
      const hasHighElementCount = screenshots.some((s: any) => 
        s.annotations?.elementCount > 1000 || 
        s.annotations?.hasContent
      );
      expect(hasHighElementCount).toBe(true);
    }, 30000);

    it('should handle pages with very long content', async () => {
      // Create a very tall page
      const tallPageHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tall Page Test</title>
          <style>
            .section { height: 1000px; padding: 20px; border-bottom: 2px solid #ccc; }
          </style>
        </head>
        <body>
          <h1>Very Tall Page</h1>
          ${Array(10).fill(0).map((_, i) => `
            <div class="section">
              <h2>Section ${i + 1}</h2>
              <p>This is section ${i + 1} of a very tall page.</p>
            </div>
          `).join('')}
        </body>
        </html>
      `;

      const testPagePath = path.join(testOutputDir, 'tall-page.html');
      await fs.mkdir(testOutputDir, { recursive: true });
      await fs.writeFile(testPagePath, tallPageHtml);

      const output = execSync(
        `npx tsx ${cliPath} capture --url file://${testPagePath} --name tall-page --duration 2000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Capture completed');
      
      // Verify screenshots were captured successfully
      const captures = await fs.readdir(testOutputDir);
      expect(captures.find(dir => dir.startsWith('tall-page-'))).toBeDefined();
    }, 20000);
  });

  describe('Unusual Page Behaviors', () => {
    it('should handle pages that redirect', async () => {
      // Test with a redirect URL
      const output = execSync(
        `npx tsx ${cliPath} capture --url https://httpstat.us/301 --name redirect --duration 3000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Capture completed');
    }, 20000);

    it('should handle pages with rapid DOM changes', async () => {
      // Create a page with rapid DOM updates
      const rapidChangesHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Rapid Changes Test</title></head>
        <body>
          <h1>Rapid DOM Changes</h1>
          <div id="container"></div>
          <script>
            let counter = 0;
            setInterval(() => {
              const container = document.getElementById('container');
              container.innerHTML = '';
              for (let i = 0; i < 10; i++) {
                const div = document.createElement('div');
                div.textContent = 'Dynamic element ' + (counter * 10 + i);
                container.appendChild(div);
              }
              counter++;
            }, 100); // Update every 100ms
          </script>
        </body>
        </html>
      `;

      const testPagePath = path.join(testOutputDir, 'rapid-changes.html');
      await fs.mkdir(testOutputDir, { recursive: true });
      await fs.writeFile(testPagePath, rapidChangesHtml);

      const output = execSync(
        `npx tsx ${cliPath} capture --url file://${testPagePath} --name rapid-changes --duration 3000 --interval 500 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Capture completed');
      
      const captures = await fs.readdir(testOutputDir);
      const captureDir = captures.find(dir => dir.startsWith('rapid-changes-'));
      const manifestPath = path.join(testOutputDir, captureDir!, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

      // Should detect multiple key frames due to rapid changes
      expect(manifest.analysis.keyFrames.length).toBeGreaterThan(2);
    }, 20000);

    it('should handle pages with infinite scroll', async () => {
      // Create a page that simulates infinite scroll
      const infiniteScrollHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Infinite Scroll Test</title>
          <style>
            .item { padding: 20px; margin: 10px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h1>Infinite Scroll Page</h1>
          <div id="container"></div>
          <script>
            let itemCount = 0;
            function addItems() {
              const container = document.getElementById('container');
              for (let i = 0; i < 10; i++) {
                const div = document.createElement('div');
                div.className = 'item';
                div.textContent = 'Item ' + (++itemCount);
                container.appendChild(div);
              }
            }
            
            // Initial items
            addItems();
            
            // Simulate scroll events adding more content
            setInterval(() => {
              if (itemCount < 50) {
                addItems();
              }
            }, 1000);
          </script>
        </body>
        </html>
      `;

      const testPagePath = path.join(testOutputDir, 'infinite-scroll.html');
      await fs.mkdir(testOutputDir, { recursive: true });
      await fs.writeFile(testPagePath, infiniteScrollHtml);

      const output = execSync(
        `npx tsx ${cliPath} capture --url file://${testPagePath} --name infinite-scroll --duration 4000 --interval 1000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Capture completed');
      
      const captures = await fs.readdir(testOutputDir);
      const captureDir = captures.find(dir => dir.startsWith('infinite-scroll-'));
      const manifestPath = path.join(testOutputDir, captureDir!, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

      // Should show increasing content over time
      const firstScreenshot = manifest.screenshots[0];
      const lastScreenshot = manifest.screenshots[manifest.screenshots.length - 1];
      
      // Element count should increase
      expect(lastScreenshot.annotations?.elementCount || 0).toBeGreaterThan(
        firstScreenshot.annotations?.elementCount || 0
      );
    }, 20000);
  });

  describe('Resource Loading Issues', () => {
    it('should handle pages with broken images', async () => {
      const brokenImagesHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Broken Images Test</title></head>
        <body>
          <h1>Page with Broken Images</h1>
          <img src="https://broken.invalid/image1.jpg" alt="Broken image 1" onerror="this.style.border='2px solid red'">
          <img src="https://broken.invalid/image2.jpg" alt="Broken image 2" onerror="this.style.border='2px solid red'">
          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%2300ff00'/%3E%3C/svg%3E" alt="Valid image">
          <p>This page contains broken image references.</p>
        </body>
        </html>
      `;

      const testPagePath = path.join(testOutputDir, 'broken-images.html');
      await fs.mkdir(testOutputDir, { recursive: true });
      await fs.writeFile(testPagePath, brokenImagesHtml);

      const output = execSync(
        `npx tsx ${cliPath} capture --url file://${testPagePath} --name broken-images --duration 3000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Capture completed');
      // Should complete despite broken images
    }, 20000);

    it('should handle pages with blocked resources (CSP)', async () => {
      const cspPageHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>CSP Test</title>
          <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none';">
        </head>
        <body>
          <h1>Page with Content Security Policy</h1>
          <p>Scripts are blocked by CSP.</p>
          <script>
            // This should be blocked
            console.log('This should not execute');
          </script>
        </body>
        </html>
      `;

      const testPagePath = path.join(testOutputDir, 'csp-page.html');
      await fs.mkdir(testOutputDir, { recursive: true });
      await fs.writeFile(testPagePath, cspPageHtml);

      const output = execSync(
        `npx tsx ${cliPath} capture --url file://${testPagePath} --name csp-test --duration 2000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Capture completed');
    }, 20000);
  });

  describe('Extreme Timing Scenarios', () => {
    it('should handle very short capture durations', async () => {
      const output = execSync(
        `npx tsx ${cliPath} capture --url https://example.com --name short-duration --duration 500 --interval 100 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Capture completed');
      
      const captures = await fs.readdir(testOutputDir);
      const captureDir = captures.find(dir => dir.startsWith('short-duration-'));
      const manifestPath = path.join(testOutputDir, captureDir!, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

      // Should still capture at least initial and final
      expect(manifest.screenshots.length).toBeGreaterThanOrEqual(2);
    }, 20000);

    it('should handle very long capture durations efficiently', async () => {
      // Test with 15 second capture but longer intervals
      const startTime = Date.now();
      
      const output = execSync(
        `npx tsx ${cliPath} capture --url https://example.com --name long-duration --duration 15000 --interval 3000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      const totalTime = Date.now() - startTime;
      
      expect(output).toContain('Capture completed');
      
      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(20000); // Should finish within 20 seconds
      
      const captures = await fs.readdir(testOutputDir);
      const captureDir = captures.find(dir => dir.startsWith('long-duration-'));
      const manifestPath = path.join(testOutputDir, captureDir!, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

      // Should have appropriate number of screenshots
      expect(manifest.screenshots.length).toBeGreaterThanOrEqual(5); // ~15s / 3s intervals
      expect(manifest.screenshots.length).toBeLessThanOrEqual(8); // Not too many
    }, 30000);
  });

  describe('Special URL Schemes', () => {
    it('should handle data URLs', async () => {
      const dataUrl = `data:text/html,<html><body><h1>Data URL Test</h1><p>This is a data URL.</p></body></html>`;
      
      const output = execSync(
        `npx tsx ${cliPath} capture --url "${dataUrl}" --name data-url --duration 2000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Capture completed');
    }, 20000);

    it('should handle about:blank gracefully', async () => {
      const output = execSync(
        `npx tsx ${cliPath} capture --url about:blank --name blank-page --duration 1000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Capture completed');
      
      const captures = await fs.readdir(testOutputDir);
      const captureDir = captures.find(dir => dir.startsWith('blank-page-'));
      const manifestPath = path.join(testOutputDir, captureDir!, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

      // Should detect blank page
      const hasBlankDetection = manifest.screenshots.some((s: any) => 
        s.annotations?.blankScreen || s.annotations?.isBlank
      );
      expect(hasBlankDetection).toBe(true);
    }, 20000);
  });
});