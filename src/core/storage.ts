import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../utils/logger.js';
import { CaptureResult } from '../types/index.js';

export class StorageManager {
  private outputDir: string;
  private projectName: string | null = null;

  constructor(outputDir: string = '../.claude-screenshots') {
    this.outputDir = outputDir;
  }

  async createCaptureDirectory(name: string): Promise<string> {
    // Extract project name from current working directory
    const cwd = process.cwd();
    const projectName = path.basename(path.dirname(cwd));
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dirName = `${name}-${timestamp}`;
    const fullPath = path.join(this.outputDir, projectName, dirName);

    try {
      await fs.mkdir(fullPath, { recursive: true });
      Logger.info('STORAGE', `Created capture directory: ${fullPath}`);
      return fullPath;
    } catch (error) {
      Logger.error('STORAGE', `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async saveScreenshot(captureDir: string, filename: string, buffer: Buffer): Promise<string> {
    const fullPath = path.join(captureDir, filename);
    
    try {
      await fs.writeFile(fullPath, buffer);
      Logger.info('STORAGE', `Saved screenshot: ${filename}`);
      return fullPath;
    } catch (error) {
      Logger.error('STORAGE', `Failed to save screenshot: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async saveManifest(captureDir: string, manifest: CaptureResult): Promise<void> {
    const manifestPath = path.join(captureDir, 'manifest.json');
    
    try {
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      Logger.success('STORAGE', 'Manifest saved successfully');
    } catch (error) {
      Logger.error('STORAGE', `Failed to save manifest: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async readManifest(captureDir: string): Promise<CaptureResult> {
    const manifestPath = path.join(captureDir, 'manifest.json');
    
    try {
      const data = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      Logger.error('STORAGE', `Failed to read manifest: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async listCaptures(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.outputDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      Logger.warn('STORAGE', `Failed to list captures: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async cleanupOldCaptures(keepCount: number = 10): Promise<void> {
    try {
      const captures = await this.listCaptures();
      const toDelete = captures.slice(keepCount);
      
      for (const capture of toDelete) {
        const capturePath = path.join(this.outputDir, capture);
        await fs.rm(capturePath, { recursive: true });
        Logger.info('STORAGE', `Cleaned up old capture: ${capture}`);
      }
    } catch (error) {
      Logger.warn('STORAGE', `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}