import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserController } from '../src/core/browser.js';
import { chromium } from 'playwright';

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

describe('BrowserController', () => {
  let browserController: BrowserController;
  let mockBrowser: any;
  let mockContext: any;
  let mockPage: any;

  beforeEach(() => {
    mockPage = {
      goto: vi.fn(),
      screenshot: vi.fn(),
      waitForLoadState: vi.fn(),
      evaluate: vi.fn(),
      waitForSelector: vi.fn(),
      close: vi.fn(),
    };

    mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn(),
    };

    mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn(),
    };

    (chromium.launch as vi.Mock).mockResolvedValue(mockBrowser);

    browserController = new BrowserController({
      headless: true,
      viewport: { width: 1920, height: 1080 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('launch', () => {
    it('should launch browser with correct options', async () => {
      await browserController.launch();

      expect(chromium.launch).toHaveBeenCalledWith({
        headless: true,
      });
      expect(mockBrowser.newContext).toHaveBeenCalledWith({
        viewport: { width: 1920, height: 1080 },
        userAgent: undefined,
      });
      expect(mockContext.newPage).toHaveBeenCalled();
    });

    it('should handle launch errors', async () => {
      (chromium.launch as vi.Mock).mockRejectedValue(new Error('Launch failed'));

      await expect(browserController.launch()).rejects.toThrow('Launch failed');
    });
  });

  describe('navigate', () => {
    it('should navigate to URL', async () => {
      await browserController.launch();
      await browserController.navigate('https://example.com');

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        waitUntil: 'domcontentloaded',
      });
    });

    it('should throw error if browser not launched', async () => {
      await expect(browserController.navigate('https://example.com')).rejects.toThrow(
        'Browser not launched. Call launch() first.'
      );
    });
  });

  describe('screenshot', () => {
    it('should take screenshot', async () => {
      await browserController.launch();
      await browserController.screenshot('/path/to/screenshot.png');

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        path: '/path/to/screenshot.png',
        fullPage: false,
      });
    });

    it('should take full page screenshot', async () => {
      await browserController.launch();
      await browserController.screenshot('/path/to/screenshot.png', true);

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        path: '/path/to/screenshot.png',
        fullPage: true,
      });
    });
  });

  describe('waitForSelector', () => {
    it('should wait for selector', async () => {
      await browserController.launch();
      await browserController.waitForSelector('.test-selector', 5000);

      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.test-selector', {
        timeout: 5000,
      });
    });

    it('should use default timeout', async () => {
      await browserController.launch();
      await browserController.waitForSelector('.test-selector');

      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.test-selector', {
        timeout: 30000,
      });
    });
  });

  describe('close', () => {
    it('should close all resources', async () => {
      await browserController.launch();
      await browserController.close();

      expect(mockPage.close).toHaveBeenCalled();
      expect(mockContext.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      await browserController.launch();
      mockPage.close.mockRejectedValue(new Error('Close failed'));

      // Should not throw
      await expect(browserController.close()).resolves.not.toThrow();
    });
  });
});