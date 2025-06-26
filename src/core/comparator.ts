import fs from 'fs/promises';
import path from 'path';
import { PNG } from 'pngjs';
import { Logger } from '../utils/logger.js';

export interface ComparisonResult {
  isMatch: boolean;
  diffPercentage: number;
  diffPixels: number;
  totalPixels: number;
  diffImagePath?: string;
}

export interface VisualRegressionResult {
  baselineExists: boolean;
  comparisons: Array<{
    screenshot: string;
    result: ComparisonResult;
  }>;
  overallMatch: boolean;
  maxDiffPercentage: number;
}

export class ScreenshotComparator {
  private threshold: number;
  private pixelThreshold: number;

  constructor(options: { threshold?: number; pixelThreshold?: number } = {}) {
    this.threshold = options.threshold || 0.1; // 0.1% difference allowed
    this.pixelThreshold = options.pixelThreshold || 10; // Per-pixel threshold (0-255)
  }

  async compareScreenshots(
    baselinePath: string,
    currentPath: string,
    outputPath?: string
  ): Promise<ComparisonResult> {
    try {
      // Read both images
      const [baselineData, currentData] = await Promise.all([
        fs.readFile(baselinePath),
        fs.readFile(currentPath),
      ]);

      const baseline = PNG.sync.read(baselineData);
      const current = PNG.sync.read(currentData);

      // Check dimensions
      if (baseline.width !== current.width || baseline.height !== current.height) {
        Logger.warn('COMPARE', `Size mismatch: ${baseline.width}x${baseline.height} vs ${current.width}x${current.height}`);
        return {
          isMatch: false,
          diffPercentage: 100,
          diffPixels: baseline.width * baseline.height,
          totalPixels: baseline.width * baseline.height,
        };
      }

      // Compare pixels
      const diff = new PNG({ width: baseline.width, height: baseline.height });
      let diffPixels = 0;
      const totalPixels = baseline.width * baseline.height;

      for (let y = 0; y < baseline.height; y++) {
        for (let x = 0; x < baseline.width; x++) {
          const idx = (baseline.width * y + x) << 2;

          const rDiff = Math.abs(baseline.data[idx] - current.data[idx]);
          const gDiff = Math.abs(baseline.data[idx + 1] - current.data[idx + 1]);
          const bDiff = Math.abs(baseline.data[idx + 2] - current.data[idx + 2]);
          const aDiff = Math.abs(baseline.data[idx + 3] - current.data[idx + 3]);

          const pixelDiff = Math.max(rDiff, gDiff, bDiff, aDiff);

          if (pixelDiff > this.pixelThreshold) {
            diffPixels++;
            // Highlight different pixels in red
            diff.data[idx] = 255;     // R
            diff.data[idx + 1] = 0;   // G
            diff.data[idx + 2] = 0;   // B
            diff.data[idx + 3] = 255; // A
          } else {
            // Copy original pixel but make it slightly transparent
            diff.data[idx] = baseline.data[idx];
            diff.data[idx + 1] = baseline.data[idx + 1];
            diff.data[idx + 2] = baseline.data[idx + 2];
            diff.data[idx + 3] = 128; // Semi-transparent
          }
        }
      }

      const diffPercentage = (diffPixels / totalPixels) * 100;
      const isMatch = diffPercentage <= this.threshold;

      const result: ComparisonResult = {
        isMatch,
        diffPercentage,
        diffPixels,
        totalPixels,
      };

      // Save diff image if requested and there are differences
      if (outputPath && diffPixels > 0) {
        const diffBuffer = PNG.sync.write(diff);
        await fs.writeFile(outputPath, diffBuffer);
        result.diffImagePath = outputPath;
        Logger.info('COMPARE', `Diff image saved to ${outputPath}`);
      }

      return result;
    } catch (error) {
      Logger.error('COMPARE', `Failed to compare screenshots: ${error}`);
      throw error;
    }
  }

  async compareWithBaseline(
    currentCaptureDir: string,
    baselineCaptureDir: string
  ): Promise<VisualRegressionResult> {
    try {
      // Check if baseline exists
      const baselineExists = await fs.access(baselineCaptureDir).then(() => true).catch(() => false);
      
      if (!baselineExists) {
        Logger.warn('COMPARE', `Baseline directory not found: ${baselineCaptureDir}`);
        return {
          baselineExists: false,
          comparisons: [],
          overallMatch: false,
          maxDiffPercentage: 0,
        };
      }

      // Read current and baseline manifests
      const [currentManifest, baselineManifest] = await Promise.all([
        this.readManifest(path.join(currentCaptureDir, 'manifest.json')),
        this.readManifest(path.join(baselineCaptureDir, 'manifest.json')),
      ]);

      if (!currentManifest || !baselineManifest) {
        throw new Error('Could not read manifest files');
      }

      // Compare key frames
      const comparisons: Array<{ screenshot: string; result: ComparisonResult }> = [];
      let maxDiffPercentage = 0;

      for (const keyFrame of currentManifest.analysis.keyFrames) {
        const currentPath = path.join(currentCaptureDir, keyFrame);
        const baselinePath = path.join(baselineCaptureDir, keyFrame);

        try {
          await fs.access(baselinePath);
          
          const diffPath = path.join(currentCaptureDir, `diff-${keyFrame}`);
          const result = await this.compareScreenshots(currentPath, baselinePath, diffPath);
          
          comparisons.push({
            screenshot: keyFrame,
            result,
          });

          maxDiffPercentage = Math.max(maxDiffPercentage, result.diffPercentage);
          
          Logger.info('COMPARE', `${keyFrame}: ${result.diffPercentage.toFixed(2)}% difference`);
        } catch (error) {
          Logger.warn('COMPARE', `Baseline screenshot not found: ${keyFrame}`);
          comparisons.push({
            screenshot: keyFrame,
            result: {
              isMatch: false,
              diffPercentage: 100,
              diffPixels: 0,
              totalPixels: 0,
            },
          });
          maxDiffPercentage = 100;
        }
      }

      const overallMatch = comparisons.every(c => c.result.isMatch);

      return {
        baselineExists: true,
        comparisons,
        overallMatch,
        maxDiffPercentage,
      };
    } catch (error) {
      Logger.error('COMPARE', `Visual regression comparison failed: ${error}`);
      throw error;
    }
  }

  async createBaseline(captureDir: string, baselineDir: string): Promise<void> {
    try {
      // Create baseline directory
      await fs.mkdir(baselineDir, { recursive: true });

      // Read current manifest to get key frames
      const manifest = await this.readManifest(path.join(captureDir, 'manifest.json'));
      if (!manifest) {
        throw new Error('Could not read capture manifest');
      }

      // Copy key frame screenshots to baseline
      for (const keyFrame of manifest.analysis.keyFrames) {
        const sourcePath = path.join(captureDir, keyFrame);
        const destPath = path.join(baselineDir, keyFrame);
        
        await fs.copyFile(sourcePath, destPath);
        Logger.info('BASELINE', `Copied ${keyFrame} to baseline`);
      }

      // Copy manifest
      await fs.copyFile(
        path.join(captureDir, 'manifest.json'),
        path.join(baselineDir, 'manifest.json')
      );

      Logger.success('BASELINE', `Baseline created at ${baselineDir}`);
    } catch (error) {
      Logger.error('BASELINE', `Failed to create baseline: ${error}`);
      throw error;
    }
  }

  private async readManifest(manifestPath: string): Promise<any> {
    try {
      const data = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      Logger.error('COMPARE', `Failed to read manifest: ${manifestPath}`);
      return null;
    }
  }
}