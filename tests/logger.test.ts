import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../src/utils/logger.js';

describe('Logger', () => {
  let consoleLogSpy: vi.SpyInstance;
  let consoleErrorSpy: vi.SpyInstance;
  let consoleWarnSpy: vi.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log info messages', () => {
    Logger.info('TEST', 'Test message');
    expect(consoleLogSpy).toHaveBeenCalled();
    const logCall = consoleLogSpy.mock.calls[0][0];
    expect(logCall).toContain('[TEST]');
    expect(logCall).toContain('Test message');
  });

  it('should log success messages', () => {
    Logger.success('TEST', 'Success message');
    expect(consoleLogSpy).toHaveBeenCalled();
    const logCall = consoleLogSpy.mock.calls[0][0];
    expect(logCall).toContain('[TEST]');
    expect(logCall).toContain('Success message');
  });

  it('should log error messages', () => {
    Logger.error('TEST', 'Error message');
    expect(consoleErrorSpy).toHaveBeenCalled();
    const logCall = consoleErrorSpy.mock.calls[0][0];
    expect(logCall).toContain('[TEST]');
    expect(logCall).toContain('Error message');
  });

  it('should log warning messages', () => {
    Logger.warn('TEST', 'Warning message');
    expect(consoleWarnSpy).toHaveBeenCalled();
    const logCall = consoleWarnSpy.mock.calls[0][0];
    expect(logCall).toContain('[TEST]');
    expect(logCall).toContain('Warning message');
  });
});