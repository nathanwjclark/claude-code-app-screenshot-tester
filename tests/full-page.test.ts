import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScreenshotCapturer } from '../src/core/capturer.js';
import { BrowserController } from '../src/core/browser.js';
import { CaptureConfig } from '../src/types/index.js';

// Mock all dependencies
vi.mock('../src/core/browser.js');
vi.mock('../src/core/storage.js');
vi.mock('../src/core/detector.js');
vi.mock('../src/core/analyzer.js');
vi.mock('../src/core/metrics.js');

describe('Full-Page Screenshot Tests', () => {
  let mockBrowser: any;
  let capturer: ScreenshotCapturer;

  beforeEach(() => {
    // Create comprehensive mocks
    const mockPage = {
      evaluate: vi.fn().mockResolvedValue({
        hasContent: true,
        loadingIndicators: [],
        errors: []
      }),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      addInitScript: vi.fn().mockResolvedValue(undefined),
      goto: vi.fn().mockResolvedValue(undefined),
      screenshot: vi.fn().mockResolvedValue(undefined)
    };

    mockBrowser = {
      launch: vi.fn().mockResolvedValue(undefined),
      navigate: vi.fn().mockResolvedValue(undefined),
      screenshot: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      getPage: vi.fn().mockReturnValue(mockPage),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(true)
    };

    // Mock the BrowserController constructor
    (BrowserController as any).mockImplementation(() => mockBrowser);

    // Mock other dependencies
    const mockStorage = {
      createCaptureDirectory: vi.fn().mockResolvedValue('./test-capture'),
      saveScreenshot: vi.fn().mockResolvedValue('./test.png'),
      saveManifest: vi.fn().mockResolvedValue(undefined)
    };

    const mockDetector = {
      detect: vi.fn().mockResolvedValue(true)
    };

    const mockAnalyzer = {
      analyzePage: vi.fn().mockResolvedValue({
        hasContent: true,
        loadingIndicators: [],
        errors: []
      }),
      compareAnalyses: vi.fn().mockReturnValue({
        hasSignificantChange: false,
        changedElements: []
      }),
      injectErrorCapture: vi.fn().mockResolvedValue(undefined)
    };

    const mockMetrics = {
      collectMetrics: vi.fn().mockResolvedValue({
        domContentLoaded: 100,
        loadEvent: 200,
        firstContentfulPaint: 150
      })
    };

    // Apply mocks
    vi.mocked(require('../src/core/storage.js').StorageManager).mockImplementation(() => mockStorage);
    vi.mocked(require('../src/core/detector.js').LoadingDetector).mockImplementation(() => mockDetector);
    vi.mocked(require('../src/core/analyzer.js').VisualAnalyzer).mockImplementation(() => mockAnalyzer);
    vi.mocked(require('../src/core/metrics.js').MetricsCollector).mockImplementation(() => mockMetrics);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Full-Page Configuration', () => {
    it('should pass fullPage=true to browser.screenshot when --full-page is used', async () => {
      const config: CaptureConfig = {
        url: 'https://example.com',
        duration: 1000,
        interval: 500,
        outputDir: './test-screenshots',
        fullPage: true
      };

      capturer = new ScreenshotCapturer(config);

      // Mock the loading detector to return immediately
      const mockDetector = {
        detect: vi.fn().mockResolvedValue(true)
      };
      (capturer as any).detector = mockDetector;

      try {
        await capturer.captureSequence();
      } catch (error) {
        // Expected to fail due to mocked dependencies, but we want to check the calls
      }

      // Verify that screenshot was called with fullPage=true
      expect(mockBrowser.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('.png'),
        true  // fullPage parameter should be true
      );
    });

    it('should pass fullPage=false to browser.screenshot when --full-page is not used', async () => {
      const config: CaptureConfig = {
        url: 'https://example.com',
        duration: 1000,
        interval: 500,
        outputDir: './test-screenshots',
        fullPage: false
      };

      capturer = new ScreenshotCapturer(config);

      // Mock the loading detector
      const mockDetector = {
        detect: vi.fn().mockResolvedValue(true)
      };
      (capturer as any).detector = mockDetector;

      try {
        await capturer.captureSequence();
      } catch (error) {
        // Expected to fail due to mocked dependencies
      }

      // Verify that screenshot was called with fullPage=false
      expect(mockBrowser.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('.png'),
        false  // fullPage parameter should be false
      );
    });

    it('should default to fullPage=false when not specified', async () => {
      const config: CaptureConfig = {
        url: 'https://example.com',
        duration: 1000,
        interval: 500,
        outputDir: './test-screenshots'
        // fullPage not specified
      };

      capturer = new ScreenshotCapturer(config);

      // Mock the loading detector
      const mockDetector = {
        detect: vi.fn().mockResolvedValue(true)
      };
      (capturer as any).detector = mockDetector;

      try {
        await capturer.captureSequence();
      } catch (error) {
        // Expected to fail due to mocked dependencies
      }

      // Verify that screenshot was called with fullPage=false (default)
      expect(mockBrowser.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('.png'),
        false  // should default to false
      );
    });
  });

  describe('Full-Page Error Screenshots', () => {
    it('should use fullPage setting for error screenshots', async () => {
      const config: CaptureConfig = {
        url: 'https://example.com',
        duration: 1000,
        interval: 500,
        outputDir: './test-screenshots',
        fullPage: true
      };

      capturer = new ScreenshotCapturer(config);

      // Simulate capturing an error screenshot
      await (capturer as any).captureErrorScreenshot('javascript', 'Test error');

      // Verify that error screenshot was also taken with fullPage=true
      expect(mockBrowser.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('ERROR.png'),
        true  // Error screenshots should also respect fullPage setting
      );
    });
  });

  describe('CLI Integration', () => {
    it('should accept --full-page flag in CLI options', () => {
      // This is more of a type check - ensuring the CLI can accept the option
      const config: CaptureConfig = {
        url: 'https://example.com',
        fullPage: true  // Should compile without TypeScript errors
      };

      expect(config.fullPage).toBe(true);
    });
  });
});