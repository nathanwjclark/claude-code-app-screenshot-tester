import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NetworkIdleStrategy,
  DOMReadyStrategy,
  ElementPresentStrategy,
  TimeoutStrategy,
  CompositeStrategy,
  LoadingDetector,
} from '../src/core/detector.js';

describe('Loading Detection Strategies', () => {
  let mockPage: any;

  beforeEach(() => {
    mockPage = {
      waitForLoadState: vi.fn(),
      waitForSelector: vi.fn(),
    };
  });

  describe('NetworkIdleStrategy', () => {
    it('should detect network idle', async () => {
      mockPage.waitForLoadState.mockResolvedValue(undefined);
      const strategy = new NetworkIdleStrategy(2000);
      
      const result = await strategy.detect(mockPage);
      
      expect(result).toBe(true);
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', { timeout: 2000 });
    });

    it('should return false on timeout', async () => {
      mockPage.waitForLoadState.mockRejectedValue(new Error('Timeout'));
      const strategy = new NetworkIdleStrategy(1000);
      
      const result = await strategy.detect(mockPage);
      
      expect(result).toBe(false);
    });
  });

  describe('ElementPresentStrategy', () => {
    it('should detect element presence', async () => {
      mockPage.waitForSelector.mockResolvedValue(undefined);
      const strategy = new ElementPresentStrategy('.app-loaded', 5000);
      
      const result = await strategy.detect(mockPage);
      
      expect(result).toBe(true);
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.app-loaded', { timeout: 5000 });
    });

    it('should return false when element not found', async () => {
      mockPage.waitForSelector.mockRejectedValue(new Error('Element not found'));
      const strategy = new ElementPresentStrategy('.missing', 1000);
      
      const result = await strategy.detect(mockPage);
      
      expect(result).toBe(false);
    });
  });

  describe('TimeoutStrategy', () => {
    it('should wait for specified duration', async () => {
      vi.useFakeTimers();
      const strategy = new TimeoutStrategy(3000);
      
      const detectPromise = strategy.detect(mockPage);
      vi.advanceTimersByTime(3000);
      const result = await detectPromise;
      
      expect(result).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('CompositeStrategy', () => {
    it('should return true if any strategy succeeds', async () => {
      const strategy1 = new NetworkIdleStrategy();
      const strategy2 = new ElementPresentStrategy('.test');
      
      vi.spyOn(strategy1, 'detect').mockResolvedValue(false);
      vi.spyOn(strategy2, 'detect').mockResolvedValue(true);
      
      const composite = new CompositeStrategy([strategy1, strategy2]);
      const result = await composite.detect(mockPage);
      
      expect(result).toBe(true);
    });

    it('should return false if all strategies fail', async () => {
      const strategy1 = new NetworkIdleStrategy();
      const strategy2 = new ElementPresentStrategy('.test');
      
      vi.spyOn(strategy1, 'detect').mockResolvedValue(false);
      vi.spyOn(strategy2, 'detect').mockResolvedValue(false);
      
      const composite = new CompositeStrategy([strategy1, strategy2]);
      const result = await composite.detect(mockPage);
      
      expect(result).toBe(false);
    });
  });

  describe('LoadingDetector', () => {
    it('should create default strategy', () => {
      const strategy = LoadingDetector.createDefaultStrategy();
      
      expect(strategy).toBeInstanceOf(CompositeStrategy);
      expect(strategy.name).toBe('composite');
    });

    it('should create strategy from config', () => {
      const config = {
        waitFor: '.app-loaded',
        duration: 5000,
      };
      
      const strategy = LoadingDetector.createFromConfig(config);
      
      expect(strategy).toBeInstanceOf(CompositeStrategy);
    });
  });
});