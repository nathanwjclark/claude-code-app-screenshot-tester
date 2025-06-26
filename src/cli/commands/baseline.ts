import { ScreenshotComparator } from '../../core/comparator.js';
import { Logger } from '../../utils/logger.js';
import path from 'path';
import fs from 'fs/promises';

interface BaselineOptions {
  output?: string;
}

export async function baselineCommand(
  captureDir: string,
  options: BaselineOptions
): Promise<void> {
  try {
    Logger.info('BASELINE', `Creating baseline from ${captureDir}`);

    // Verify capture directory exists
    try {
      await fs.access(captureDir);
    } catch (error) {
      Logger.error('BASELINE', `Capture directory not found: ${captureDir}`);
      process.exit(1);
    }

    // Check if manifest exists
    const manifestPath = path.join(captureDir, 'manifest.json');
    try {
      await fs.access(manifestPath);
    } catch (error) {
      Logger.error('BASELINE', `Manifest not found: ${manifestPath}`);
      Logger.error('BASELINE', 'Make sure the capture directory contains a valid capture');
      process.exit(1);
    }

    // Determine baseline directory
    const baselineDir = options.output || './baselines';
    const captureName = path.basename(captureDir);
    const baselinePath = path.join(baselineDir, `baseline-${captureName}`);

    // Create baseline
    const comparator = new ScreenshotComparator();
    await comparator.createBaseline(captureDir, baselinePath);

    Logger.success('BASELINE', `✅ Baseline created at: ${baselinePath}`);

    // Read and display key frame information
    const manifestData = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestData);

    console.log('\n📸 Baseline Screenshots:');
    console.log('=' .repeat(40));
    manifest.analysis.keyFrames.forEach((keyFrame: string) => {
      console.log(`  📄 ${keyFrame}`);
    });
    console.log('=' .repeat(40));

    console.log('\n💡 Usage:');
    console.log(`  To compare future captures with this baseline:`);
    console.log(`  npx tsx src/cli/index.ts compare <new-capture-dir> ${baselinePath}`);

  } catch (error) {
    Logger.error('BASELINE', `Failed to create baseline: ${error}`);
    process.exit(1);
  }
}