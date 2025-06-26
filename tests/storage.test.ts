import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { StorageManager } from '../src/core/storage.js';

vi.mock('fs/promises');

describe('StorageManager', () => {
  let storage: StorageManager;
  const mockFs = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new StorageManager('./test-screenshots');
  });

  describe('createCaptureDirectory', () => {
    it('should create directory with timestamp', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      
      const result = await storage.createCaptureDirectory('test-capture');
      
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('test-capture-'),
        { recursive: true }
      );
      expect(result).toContain('test-capture-');
    });

    it('should handle mkdir errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      
      await expect(storage.createCaptureDirectory('test')).rejects.toThrow('Permission denied');
    });
  });

  describe('saveScreenshot', () => {
    it('should save screenshot buffer to file', async () => {
      mockFs.writeFile.mockResolvedValue();
      const buffer = Buffer.from('fake-image-data');
      
      const result = await storage.saveScreenshot('/capture/dir', 'screenshot.png', buffer);
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join('/capture/dir', 'screenshot.png'),
        buffer
      );
      expect(result).toBe(path.join('/capture/dir', 'screenshot.png'));
    });
  });

  describe('saveManifest', () => {
    it('should save manifest as JSON', async () => {
      mockFs.writeFile.mockResolvedValue();
      const manifest: any = {
        captureId: 'test-123',
        metadata: { url: 'https://example.com' },
        screenshots: [],
        analysis: { loadingDuration: 2000, keyFrames: [], issues: [], recommendations: [] },
        outputDir: '/test/dir',
      };
      
      await storage.saveManifest('/capture/dir', manifest);
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join('/capture/dir', 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );
    });
  });

  describe('readManifest', () => {
    it('should read and parse manifest', async () => {
      const manifest = {
        captureId: 'test-123',
        metadata: { url: 'https://example.com' },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(manifest));
      
      const result = await storage.readManifest('/capture/dir');
      
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join('/capture/dir', 'manifest.json'),
        'utf-8'
      );
      expect(result).toEqual(manifest);
    });
  });

  describe('listCaptures', () => {
    it('should list capture directories', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'capture-1', isDirectory: () => true },
        { name: 'capture-2', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
      ] as any);
      
      const result = await storage.listCaptures();
      
      expect(result).toEqual(['capture-2', 'capture-1']); // Reversed order
    });

    it('should return empty array on error', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));
      
      const result = await storage.listCaptures();
      
      expect(result).toEqual([]);
    });
  });

  describe('cleanupOldCaptures', () => {
    it('should delete old captures beyond keep count', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'capture-1', isDirectory: () => true },
        { name: 'capture-2', isDirectory: () => true },
        { name: 'capture-3', isDirectory: () => true },
      ] as any);
      mockFs.rm.mockResolvedValue();
      
      await storage.cleanupOldCaptures(2);
      
      expect(mockFs.rm).toHaveBeenCalledTimes(1);
      expect(mockFs.rm).toHaveBeenCalledWith(
        expect.stringContaining('capture-1'),
        { recursive: true }
      );
    });
  });
});