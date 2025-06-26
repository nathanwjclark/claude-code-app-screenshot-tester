import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VisualAnalyzer } from '../src/core/analyzer.js';

describe('VisualAnalyzer', () => {
  let analyzer: VisualAnalyzer;
  let mockPage: any;

  beforeEach(() => {
    analyzer = new VisualAnalyzer();
    mockPage = {
      evaluate: vi.fn(),
      addInitScript: vi.fn(),
    };
  });

  describe('analyzePage', () => {
    it('should analyze page content correctly', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        hasContent: true,
        isBlank: false,
        textContent: 'Test content',
        elementCount: 50,
        imageCount: 3,
        hasErrors: false,
        errorMessages: [],
        loadingIndicators: [],
      }).mockResolvedValueOnce({
        domContentLoaded: 100,
        load: 200,
        firstPaint: 50,
        domInteractive: 150,
      });

      const result = await analyzer.analyzePage(mockPage);

      expect(result.hasContent).toBe(true);
      expect(result.isBlank).toBe(false);
      expect(result.elementCount).toBe(50);
      expect(result.imageCount).toBe(3);
      expect(result.hasErrors).toBe(false);
      expect(result.performanceMetrics).toBeDefined();
    });

    it('should detect loading indicators', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        hasContent: true,
        isBlank: false,
        textContent: 'Loading...',
        elementCount: 20,
        imageCount: 0,
        hasErrors: false,
        errorMessages: [],
        loadingIndicators: ['.spinner (1)', 'Loading text detected'],
      }).mockResolvedValueOnce({});

      const result = await analyzer.analyzePage(mockPage);

      expect(result.loadingIndicators).toHaveLength(2);
      expect(result.loadingIndicators).toContain('.spinner (1)');
      expect(result.loadingIndicators).toContain('Loading text detected');
    });

    it('should detect errors', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        hasContent: true,
        isBlank: false,
        textContent: 'Error occurred',
        elementCount: 30,
        imageCount: 1,
        hasErrors: true,
        errorMessages: ['Something went wrong', 'Console error'],
        loadingIndicators: [],
      }).mockResolvedValueOnce({});

      const result = await analyzer.analyzePage(mockPage);

      expect(result.hasErrors).toBe(true);
      expect(result.errorMessages).toHaveLength(2);
      expect(result.errorMessages).toContain('Something went wrong');
    });

    it('should handle analysis errors gracefully', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Evaluation failed'));

      const result = await analyzer.analyzePage(mockPage);

      expect(result.hasContent).toBe(false);
      expect(result.isBlank).toBe(true);
      expect(result.hasErrors).toBe(true);
      expect(result.errorMessages).toContain('Failed to analyze page');
    });
  });

  describe('compareAnalyses', () => {
    it('should detect content appearance', () => {
      const previous = {
        hasContent: false,
        isBlank: true,
        textContent: '',
        elementCount: 5,
        imageCount: 0,
        hasErrors: false,
        errorMessages: [],
        loadingIndicators: [],
      };

      const current = {
        hasContent: true,
        isBlank: false,
        textContent: 'Hello World',
        elementCount: 25,
        imageCount: 2,
        hasErrors: false,
        errorMessages: [],
        loadingIndicators: [],
      };

      const diff = analyzer.compareAnalyses(previous, current);

      expect(diff.hasSignificantChange).toBe(true);
      expect(diff.changedElements).toContain('Content appeared');
    });

    it('should detect loading state changes', () => {
      const previous = {
        hasContent: true,
        isBlank: false,
        textContent: 'Loading...',
        elementCount: 20,
        imageCount: 0,
        hasErrors: false,
        errorMessages: [],
        loadingIndicators: ['.spinner (1)'],
      };

      const current = {
        hasContent: true,
        isBlank: false,
        textContent: 'Welcome',
        elementCount: 30,
        imageCount: 3,
        hasErrors: false,
        errorMessages: [],
        loadingIndicators: [],
      };

      const diff = analyzer.compareAnalyses(previous, current);

      expect(diff.hasSignificantChange).toBe(true);
      expect(diff.changedElements).toContain('Loading indicators removed');
    });

    it('should detect error appearance', () => {
      const previous = {
        hasContent: true,
        isBlank: false,
        textContent: 'Normal content',
        elementCount: 30,
        imageCount: 2,
        hasErrors: false,
        errorMessages: [],
        loadingIndicators: [],
      };

      const current = {
        hasContent: true,
        isBlank: false,
        textContent: 'Error: Something went wrong',
        elementCount: 35,
        imageCount: 2,
        hasErrors: true,
        errorMessages: ['Something went wrong'],
        loadingIndicators: [],
      };

      const diff = analyzer.compareAnalyses(previous, current);

      expect(diff.hasSignificantChange).toBe(true);
      expect(diff.changedElements).toContain('Errors detected');
    });
  });

  describe('injectErrorCapture', () => {
    it('should inject error capture script', async () => {
      await analyzer.injectErrorCapture(mockPage);

      expect(mockPage.addInitScript).toHaveBeenCalled();
      const script = mockPage.addInitScript.mock.calls[0][0];
      expect(typeof script).toBe('function');
    });

    it('should handle injection errors gracefully', async () => {
      mockPage.addInitScript.mockRejectedValue(new Error('Injection failed'));

      // Should not throw
      await expect(analyzer.injectErrorCapture(mockPage)).resolves.not.toThrow();
    });
  });
});