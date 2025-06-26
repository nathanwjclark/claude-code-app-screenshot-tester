import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScreenshotCapturer } from '../src/core/capturer.js';

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

describe('ScreenshotCapturer', () => {
  let capturer: ScreenshotCapturer;
  let mockBrowser: any;
  let mockStorage: any;
  let mockAnalyzer: any;
  let mockMetrics: any;
  let mockPage: any;

  const defaultConfig = {
    url: 'https://test.example.com',
    name: 'test-capture',
    duration: 5000,
    interval: 1000,
    outputDir: './test-screenshots',
    viewport: { width: 1280, height: 720 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock page object
    mockPage = {
      on: vi.fn(),
      evaluate: vi.fn(),
      waitForLoadState: vi.fn(),
      waitForSelector: vi.fn(),
    };

    // Mock browser
    mockBrowser = {
      launch: vi.fn().mockResolvedValue(undefined),
      navigate: vi.fn().mockResolvedValue(undefined),
      screenshot: vi.fn().mockResolvedValue(undefined),
      getPage: vi.fn().mockReturnValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn(),
      waitForSelector: vi.fn(),
    };

    // Mock storage
    mockStorage = {
      createCaptureDirectory: vi.fn().mockResolvedValue('/test/capture/dir'),
      saveScreenshot: vi.fn().mockResolvedValue('/test/screenshot.png'),
      saveManifest: vi.fn().mockResolvedValue(undefined),
      readManifest: vi.fn(),
      listCaptures: vi.fn(),
      cleanupOldCaptures: vi.fn(),
    } as any;

    // Mock analyzer
    mockAnalyzer = {
      analyzePage: vi.fn().mockResolvedValue({
        hasContent: true,
        isBlank: false,
        textContent: 'Test content',
        elementCount: 50,
        imageCount: 3,
        hasErrors: false,
        errorMessages: [],
        loadingIndicators: [],
      }),
      injectErrorCapture: vi.fn().mockResolvedValue(undefined),
      compareAnalyses: vi.fn().mockReturnValue({
        hasSignificantChange: false,
        changePercentage: 5,
        changedElements: [],
      }),
    } as any;

    // Mock metrics collector
    mockMetrics = {
      setupMetricsCollection: vi.fn().mockResolvedValue(undefined),
      collectMetrics: vi.fn().mockResolvedValue({
        domContentLoaded: 1000,
        loadEvent: 1500,
        firstContentfulPaint: 800,
        largestContentfulPaint: 1200,
        resourceCount: 10,
        totalResourceSize: 1024000,
        requestCount: 15,
        failedRequests: 0,
        timestamp: Date.now(),
      }),
      analyzePerformance: vi.fn().mockReturnValue([]),
    };

    // Set up mocks
    vi.mocked(BrowserController).mockImplementation(() => mockBrowser);
    vi.mocked(StorageManager).mockImplementation(() => mockStorage);
    vi.mocked(VisualAnalyzer).mockImplementation(() => mockAnalyzer);
    vi.mocked(MetricsCollector).mockImplementation(() => mockMetrics);

    capturer = new ScreenshotCapturer(defaultConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('captureSequence', () => {
    it('should complete a basic capture sequence', async () => {
      const capturePromise = capturer.captureSequence();

      // Fast-forward through capture intervals
      await vi.advanceTimersByTimeAsync(5000);

      const result = await capturePromise;

      expect(mockBrowser.launch).toHaveBeenCalled();
      expect(mockBrowser.navigate).toHaveBeenCalledWith('https://test.example.com');
      expect(mockBrowser.screenshot).toHaveBeenCalled();
      expect(mockStorage.saveManifest).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
      
      expect(result.captureId).toContain('test-capture');
      expect(result.screenshots.length).toBeGreaterThan(0);
    });

    it('should inject error capture before navigation', async () => {
      const capturePromise = capturer.captureSequence();
      await vi.advanceTimersByTimeAsync(100);

      expect(mockAnalyzer.injectErrorCapture).toHaveBeenCalledWith(mockPage);
      expect(mockAnalyzer.injectErrorCapture).toHaveBeenCalledBefore(mockBrowser.navigate);

      await vi.advanceTimersByTimeAsync(5000);
      await capturePromise;
    });

    it('should set up error event handlers', async () => {
      const capturePromise = capturer.captureSequence();
      await vi.advanceTimersByTimeAsync(100);

      expect(mockPage.on).toHaveBeenCalledWith('pageerror', expect.any(Function));
      expect(mockPage.on).toHaveBeenCalledWith('crash', expect.any(Function));

      await vi.advanceTimersByTimeAsync(5000);
      await capturePromise;
    });

    it('should handle browser launch failure', async () => {
      mockBrowser.launch.mockRejectedValue(new Error('Browser launch failed'));

      await expect(capturer.captureSequence()).rejects.toThrow('Browser launch failed');
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle navigation failure', async () => {
      mockBrowser.navigate.mockRejectedValue(new Error('Navigation failed'));

      await expect(capturer.captureSequence()).rejects.toThrow('Navigation failed');
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('screenshot capture', () => {
    it('should capture initial screenshot immediately', async () => {
      const capturePromise = capturer.captureSequence();
      
      // Should capture initial screenshot right after navigation
      await vi.advanceTimersByTimeAsync(100);
      
      expect(mockBrowser.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('000-0ms.png')
      );

      await vi.advanceTimersByTimeAsync(5000);
      await capturePromise;
    });

    it('should capture screenshots at specified intervals', async () => {
      const capturePromise = capturer.captureSequence();
      
      // Advance time to trigger interval captures
      await vi.advanceTimersByTimeAsync(2500);
      
      // Should have captured: initial + 2 interval screenshots
      expect(mockBrowser.screenshot).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(2500);
      await capturePromise;
    });

    it('should capture final screenshot', async () => {
      const capturePromise = capturer.captureSequence();
      
      await vi.advanceTimersByTimeAsync(5000);
      await capturePromise;

      // Check that final screenshot was captured
      const lastCall = mockBrowser.screenshot.mock.calls[mockBrowser.screenshot.mock.calls.length - 1][0];
      expect(lastCall).toMatch(/\d{3}-\d+ms\.png$/);
    });
  });

  describe('key frame detection', () => {
    it('should mark first screenshot as key frame', async () => {
      const capturePromise = capturer.captureSequence();
      
      await vi.advanceTimersByTimeAsync(5000);
      const result = await capturePromise;

      expect(result.screenshots[0].annotations?.isKeyFrame).toBe(true);
    });

    it('should detect significant visual changes', async () => {
      // First analysis shows loading
      mockAnalyzer.analyzePage.mockResolvedValueOnce({
        hasContent: false,
        isBlank: true,
        textContent: '',
        elementCount: 5,
        imageCount: 0,
        hasErrors: false,
        errorMessages: [],
        loadingIndicators: ['spinner'],
      });

      // Second analysis shows content
      mockAnalyzer.analyzePage.mockResolvedValueOnce({
        hasContent: true,
        isBlank: false,
        textContent: 'Content loaded',
        elementCount: 50,
        imageCount: 5,
        hasErrors: false,
        errorMessages: [],
        loadingIndicators: [],
      });

      // Mark as significant change
      mockAnalyzer.compareAnalyses.mockReturnValueOnce({
        hasSignificantChange: true,
        changePercentage: 80,
        changedElements: ['Content appeared', 'Loading indicators removed'],
      });

      const capturePromise = capturer.captureSequence();
      await vi.advanceTimersByTimeAsync(5000);
      const result = await capturePromise;

      // Second screenshot should be marked as key frame
      expect(result.screenshots[1].annotations?.isKeyFrame).toBe(true);
      expect(result.analysis.keyFrames).toContain(result.screenshots[1].filename);
    });
  });

  describe('error handling', () => {
    it('should capture error screenshot on page error', async () => {
      const capturePromise = capturer.captureSequence();
      await vi.advanceTimersByTimeAsync(100);

      // Get the error handler
      const errorHandler = mockPage.on.mock.calls.find(
        call => call[0] === 'pageerror'
      )?.[1];

      // Simulate a JavaScript error
      const error = new Error('Test JavaScript error');
      await errorHandler(error);

      // Should capture error screenshot
      expect(mockBrowser.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('ERROR.png')
      );

      await vi.advanceTimersByTimeAsync(5000);
      const result = await capturePromise;

      // Check error was recorded
      const errorScreenshot = result.screenshots.find(s => 
        s.filename.includes('ERROR')
      );
      expect(errorScreenshot).toBeDefined();
      expect(errorScreenshot?.annotations?.hasErrors).toBe(true);
      expect(errorScreenshot?.annotations?.errorMessages).toContain(
        'js-error: Test JavaScript error'
      );
    });

    it('should capture error screenshot on page crash', async () => {
      const capturePromise = capturer.captureSequence();
      await vi.advanceTimersByTimeAsync(100);

      // Get the crash handler
      const crashHandler = mockPage.on.mock.calls.find(
        call => call[0] === 'crash'
      )?.[1];

      // Simulate a page crash
      await crashHandler();

      // Should capture error screenshot
      expect(mockBrowser.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('ERROR.png')
      );

      await vi.advanceTimersByTimeAsync(5000);
      await capturePromise;
    });
  });

  describe('loading detection', () => {
    it('should stop capturing when loading is detected as complete', async () => {
      // Mock network idle detection after 2 seconds
      mockPage.waitForLoadState.mockImplementation(async (state: string) => {
        if (state === 'networkidle') {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      });

      const capturePromise = capturer.captureSequence();
      
      // Advance to when loading completes
      await vi.advanceTimersByTimeAsync(2500);
      
      const screenshotCount = mockBrowser.screenshot.mock.calls.length;
      
      // Advance more time
      await vi.advanceTimersByTimeAsync(2500);
      
      // Should have final screenshot but no more interval captures
      expect(mockBrowser.screenshot).toHaveBeenCalledTimes(screenshotCount + 1);
      
      await capturePromise;
    });
  });

  describe('manifest generation', () => {
    it('should include all required fields in manifest', async () => {
      const capturePromise = capturer.captureSequence();
      await vi.advanceTimersByTimeAsync(5000);
      await capturePromise;

      const manifestCall = mockStorage.saveManifest.mock.calls[0];
      const manifest = manifestCall[1];

      expect(manifest).toHaveProperty('captureId');
      expect(manifest).toHaveProperty('metadata');
      expect(manifest).toHaveProperty('screenshots');
      expect(manifest).toHaveProperty('analysis');
      expect(manifest).toHaveProperty('outputDir');

      expect(manifest.metadata).toMatchObject({
        url: 'https://test.example.com',
        viewport: { width: 1280, height: 720 },
        userAgent: 'Playwright',
        timestamp: expect.any(String),
      });
    });

    it('should detect issues in analysis', async () => {
      // Mock blank screen at end
      mockAnalyzer.analyzePage.mockResolvedValue({
        hasContent: false,
        isBlank: true,
        textContent: '',
        elementCount: 0,
        imageCount: 0,
        hasErrors: false,
        errorMessages: [],
        loadingIndicators: [],
      });

      const capturePromise = capturer.captureSequence();
      await vi.advanceTimersByTimeAsync(5000);
      const result = await capturePromise;

      expect(result.analysis.issues).toContain('Page appears blank at end of capture');
    });
  });

  describe('resource cleanup', () => {
    it('should close browser even if error occurs', async () => {
      mockStorage.saveManifest.mockRejectedValue(new Error('Save failed'));

      const capturePromise = capturer.captureSequence();
      await vi.advanceTimersByTimeAsync(5000);

      await expect(capturePromise).rejects.toThrow('Save failed');
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });
});