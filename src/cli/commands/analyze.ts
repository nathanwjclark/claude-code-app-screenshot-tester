import { Logger } from '../../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

export async function analyzeCommand(captureDir: string): Promise<void> {
  try {
    Logger.info('ANALYZE', `Analyzing capture: ${captureDir}`);
    
    // Check if directory exists
    try {
      await fs.access(captureDir);
    } catch {
      throw new Error(`Capture directory not found: ${captureDir}`);
    }
    
    // Read manifest
    const manifestPath = path.join(captureDir, 'manifest.json');
    try {
      const manifestData = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestData);
      
      Logger.info('ANALYZE', `Capture ID: ${manifest.captureId}`);
      Logger.info('ANALYZE', `URL: ${manifest.metadata.url}`);
      Logger.info('ANALYZE', `Screenshots: ${manifest.screenshots.length}`);
      Logger.info('ANALYZE', `Loading duration: ${manifest.analysis.loadingDuration}ms`);
      
      if (manifest.analysis.keyFrames?.length > 0) {
        Logger.info('ANALYZE', `Key frames: ${manifest.analysis.keyFrames.join(', ')}`);
      }
      
      if (manifest.analysis.issues?.length > 0) {
        Logger.warn('ANALYZE', 'Issues detected:');
        manifest.analysis.issues.forEach((issue: string) => {
          Logger.warn('ANALYZE', `  - ${issue}`);
        });
      }
      
      Logger.success('ANALYZE', 'Analysis complete');
    } catch (error) {
      throw new Error(`Failed to read manifest: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    Logger.error('ANALYZE', `Failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}