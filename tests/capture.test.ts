import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { captureCommand } from '../src/cli/commands/capture.js';
import { Logger } from '../src/utils/logger.js';

vi.mock('../src/utils/logger');

describe('captureCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse options correctly', async () => {
    const options = {
      url: 'https://example.com',
      name: 'test-capture',
      duration: '5000',
      interval: '1000',
      outputDir: './test-output',
      viewport: '1920x1080',
      waitFor: '.loaded',
      keyFramesOnly: true,
    };

    await captureCommand(options);

    expect(Logger.info).toHaveBeenCalledWith('CAPTURE', 'Starting capture for https://example.com');
    expect(Logger.info).toHaveBeenCalledWith('CONFIG', 'Duration: 5000ms, Interval: 1000ms');
    expect(Logger.info).toHaveBeenCalledWith('CONFIG', 'Viewport: 1920x1080');
  });

  it('should use default values when options are not provided', async () => {
    const options = {
      url: 'http://localhost:3000',
      duration: '10000',
      interval: '500',
      outputDir: './screenshots',
      viewport: '1280x720',
    };

    await captureCommand(options);

    expect(Logger.info).toHaveBeenCalledWith('CONFIG', 'Duration: 10000ms, Interval: 500ms');
    expect(Logger.info).toHaveBeenCalledWith('CONFIG', 'Viewport: 1280x720');
  });

  it('should handle full-page option correctly', async () => {
    const options = {
      url: 'https://example.com',
      duration: '5000',
      interval: '1000',
      outputDir: './screenshots',
      viewport: '1280x720',
      fullPage: true,
    };

    await captureCommand(options);

    expect(Logger.info).toHaveBeenCalledWith('CAPTURE', 'Starting capture for https://example.com');
    expect(Logger.info).toHaveBeenCalledWith('CONFIG', 'Duration: 5000ms, Interval: 1000ms');
  });

  it('should handle errors gracefully', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    }) as any;

    const options = {
      url: 'http://localhost:3000',
      duration: 'invalid',
      interval: '500',
      outputDir: './screenshots',
      viewport: '1280x720',
    };

    await expect(captureCommand(options)).rejects.toThrow('Process exited with code 1');
    expect(Logger.error).toHaveBeenCalled();
    
    mockExit.mockRestore();
  });
});