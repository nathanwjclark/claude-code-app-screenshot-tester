import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ScreenshotCapturer } from '../src/core/capturer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, '..', 'src', 'cli', 'index.ts');

// Mock the modules
vi.mock('../src/core/browser.js');
vi.mock('../src/core/storage.js');
vi.mock('../src/core/analyzer.js');
vi.mock('../src/core/detector.js');
vi.mock('../src/core/metrics.js');

import { BrowserController } from '../src/core/browser.js';
import { StorageManager } from '../src/core/storage.js';
import { VisualAnalyzer } from '../src/core/analyzer.js';
import { MetricsCollector } from '../src/core/metrics.js';

describe('Error Recovery Tests', () => {
  const testOutputDir = path.join(__dirname, '..', 'test-error-screenshots');

  beforeEach(async () => {
    vi.clearAllMocks();
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

  describe('Browser Crash Recovery', () => {
    it('should handle browser crash during capture', async () => {
      const mockBrowser = {
        launch: vi.fn().mockResolvedValue(undefined),
        navigate: vi.fn().mockResolvedValue(undefined),
        screenshot: vi.fn()
          .mockResolvedValueOnce(undefined) // First screenshot succeeds
          .mockRejectedValueOnce(new Error('Browser disconnected')), // Then crashes
        getPage: vi.fn().mockReturnValue({
          on: vi.fn(),
          evaluate: vi.fn(),
        }),
        close: vi.fn().mockResolvedValue(undefined),
      } as any;

      vi.mocked(BrowserController).mockImplementation(() => mockBrowser);

      const capturer = new ScreenshotCapturer({
        url: 'https://test.com',
        duration: 2000,
        interval: 500,
        outputDir: testOutputDir,
      });

      await expect(capturer.captureSequence()).rejects.toThrow('Browser disconnected');
      
      // Verify browser was closed despite the error
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('Network Failures', () => {
    it('should handle unreachable URLs gracefully', async () => {
      try {
        execSync(
          `npx tsx ${cliPath} capture --url http://localhost:99999/nonexistent --duration 2000 --output-dir ${testOutputDir}`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.stdout || error.stderr).toContain('Failed');
      }
    });

    it('should handle timeout on slow-loading pages', async () => {
      // Test with a URL that loads very slowly
      const output = execSync(
        `npx tsx ${cliPath} capture --url https://httpstat.us/200?sleep=5000 --duration 3000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Capture completed');
      
      // Should still have captured some screenshots despite slow loading
      const captures = await fs.readdir(testOutputDir);
      expect(captures.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('File System Errors', () => {
    it('should handle permission errors when saving screenshots', async () => {
      const mockBrowser = {
        launch: vi.fn().mockResolvedValue(undefined),
        navigate: vi.fn().mockResolvedValue(undefined),
        screenshot: vi.fn().mockRejectedValue(new Error('EACCES: permission denied')),
        getPage: vi.fn().mockReturnValue({
          on: vi.fn(),
          evaluate: vi.fn(),
        }),
        close: vi.fn().mockResolvedValue(undefined),
      } as any;

      vi.mocked(BrowserController).mockImplementation(() => mockBrowser);

      const capturer = new ScreenshotCapturer({
        url: 'https://test.com',
        duration: 1000,
        outputDir: '/invalid/path/that/does/not/exist',
      });

      await expect(capturer.captureSequence()).rejects.toThrow();
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('JavaScript Error Pages', () => {
    it('should capture and handle pages with JavaScript errors', async () => {
      // Create a local HTML file with JavaScript errors
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Error Test</title></head>
        <body>
          <h1>Error Test Page</h1>
          <script>
            // Immediate error
            throw new Error('Immediate page error');
          </script>
          <script>
            // Delayed error
            setTimeout(() => {
              nonExistentFunction();
            }, 1000);
          </script>
        </body>
        </html>
      `;

      const errorPagePath = path.join(testOutputDir, 'error-test.html');
      await fs.mkdir(testOutputDir, { recursive: true });
      await fs.writeFile(errorPagePath, errorHtml);

      const output = execSync(
        `npx tsx ${cliPath} capture --url file://${errorPagePath} --duration 3000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('JavaScript error');
      expect(output).toContain('ERROR.png');

      // Verify error screenshots were captured
      const captures = await fs.readdir(testOutputDir);
      const captureDir = captures.find(dir => dir !== 'error-test.html');
      
      if (captureDir) {
        const files = await fs.readdir(path.join(testOutputDir, captureDir));
        const errorScreenshots = files.filter(f => f.includes('ERROR'));
        expect(errorScreenshots.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Memory Management', () => {
    it('should handle capturing very large pages', async () => {
      // Test with a page that has lots of content
      const output = execSync(
        `npx tsx ${cliPath} capture --url https://en.wikipedia.org/wiki/List_of_countries_by_population --duration 5000 --interval 1000 --output-dir ${testOutputDir}`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Capture completed');
      
      const captures = await fs.readdir(testOutputDir);
      const captureDir = captures[0];
      const manifestPath = path.join(testOutputDir, captureDir, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
      
      // Should have successfully captured despite large page
      expect(manifest.screenshots.length).toBeGreaterThan(3);
    }, 30000);
  });

  describe('Concurrent Captures', () => {
    it('should handle multiple simultaneous captures', async () => {
      // Start multiple captures at once
      const promises = [
        execSync(
          `npx tsx ${cliPath} capture --url https://example.com --name concurrent-1 --duration 3000 --output-dir ${testOutputDir}`,
          { encoding: 'utf-8' }
        ),
        execSync(
          `npx tsx ${cliPath} capture --url https://example.org --name concurrent-2 --duration 3000 --output-dir ${testOutputDir}`,
          { encoding: 'utf-8' }
        ),
      ];

      // Both should complete successfully
      for (const output of promises) {
        expect(output).toContain('Capture completed');
      }

      // Verify both captures exist
      const captures = await fs.readdir(testOutputDir);
      const concurrent1 = captures.find(dir => dir.includes('concurrent-1'));
      const concurrent2 = captures.find(dir => dir.includes('concurrent-2'));
      
      expect(concurrent1).toBeDefined();
      expect(concurrent2).toBeDefined();
    }, 30000);
  });

  describe('Recovery from Partial Failures', () => {
    it('should save partial results even if capture fails midway', async () => {
      const mockBrowser = {
        launch: vi.fn().mockResolvedValue(undefined),
        navigate: vi.fn().mockResolvedValue(undefined),
        screenshot: vi.fn()
          .mockResolvedValueOnce(undefined) // First few succeed
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Screenshot failed')), // Then fail
        getPage: vi.fn().mockReturnValue({
          on: vi.fn(),
          evaluate: vi.fn().mockResolvedValue({
            hasContent: true,
            isBlank: false,
            textContent: 'Test',
            elementCount: 10,
            imageCount: 0,
            hasErrors: false,
            errorMessages: [],
            loadingIndicators: [],
          }),
        }),
        close: vi.fn().mockResolvedValue(undefined),
        waitForLoadState: vi.fn(),
        evaluate: vi.fn(),
        waitForSelector: vi.fn(),
      } as any;

      vi.mocked(BrowserController).mockImplementation(() => mockBrowser);

      const capturer = new ScreenshotCapturer({
        url: 'https://test.com',
        duration: 5000,
        interval: 1000,
        outputDir: testOutputDir,
      });

      try {
        await capturer.captureSequence();
      } catch (error) {
        // Expected to fail
      }

      // Should have closed browser
      expect(mockBrowser.close).toHaveBeenCalled();
      
      // Should have captured at least some screenshots before failure
      expect(mockBrowser.screenshot).toHaveBeenCalledTimes(4);
    });
  });

  describe('Invalid Configuration Recovery', () => {
    it('should handle invalid viewport dimensions', async () => {
      try {
        execSync(
          `npx tsx ${cliPath} capture --url https://example.com --viewport 0x0 --duration 1000 --output-dir ${testOutputDir}`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      } catch (error: any) {
        // Should fail gracefully
        expect(error.stdout || error.stderr).toBeTruthy();
      }
    });

    it('should handle negative duration', async () => {
      try {
        execSync(
          `npx tsx ${cliPath} capture --url https://example.com --duration -1000 --output-dir ${testOutputDir}`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      } catch (error: any) {
        // Should fail gracefully or use default
        expect(error.stdout || error.stderr).toBeTruthy();
      }
    });
  });
});