import { ScreenshotComparator } from '../../core/comparator.js';
import { Logger } from '../../utils/logger.js';

interface CompareOptions {
  threshold?: string;
  pixelThreshold?: string;
}

export async function compareCommand(
  currentDir: string,
  baselineDir: string,
  options: CompareOptions
): Promise<void> {
  try {
    Logger.info('COMPARE', `Comparing ${currentDir} with baseline ${baselineDir}`);

    const comparator = new ScreenshotComparator({
      threshold: options.threshold ? parseFloat(options.threshold) : 0.1,
      pixelThreshold: options.pixelThreshold ? parseInt(options.pixelThreshold) : 10,
    });

    const result = await comparator.compareWithBaseline(currentDir, baselineDir);

    // Display results
    Logger.info('COMPARE', `Baseline exists: ${result.baselineExists}`);
    
    if (!result.baselineExists) {
      Logger.warn('COMPARE', 'No baseline found. Create one using the baseline command.');
      process.exit(1);
    }

    Logger.info('COMPARE', `Overall match: ${result.overallMatch}`);
    Logger.info('COMPARE', `Max difference: ${result.maxDiffPercentage.toFixed(2)}%`);

    console.log('\n📊 Comparison Results:');
    console.log('=' .repeat(50));

    for (const comparison of result.comparisons) {
      const status = comparison.result.isMatch ? '✅' : '❌';
      const diff = comparison.result.diffPercentage.toFixed(2);
      
      console.log(`${status} ${comparison.screenshot}: ${diff}% difference`);
      
      if (comparison.result.diffImagePath) {
        console.log(`   🔍 Diff image: ${comparison.result.diffImagePath}`);
      }
    }

    console.log('=' .repeat(50));

    if (result.overallMatch) {
      Logger.success('COMPARE', '🎉 All screenshots match baseline!');
    } else {
      Logger.error('COMPARE', `❌ ${result.comparisons.filter(c => !c.result.isMatch).length} screenshots differ from baseline`);
      
      // List specific failures
      const failures = result.comparisons.filter(c => !c.result.isMatch);
      if (failures.length > 0) {
        console.log('\n🚨 Failed comparisons:');
        failures.forEach(failure => {
          console.log(`  - ${failure.screenshot}: ${failure.result.diffPercentage.toFixed(2)}% difference`);
        });
      }
      
      process.exit(1);
    }

  } catch (error) {
    Logger.error('COMPARE', `Comparison failed: ${error}`);
    process.exit(1);
  }
}