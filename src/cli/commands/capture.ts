import { CaptureConfig } from '../../types/index.js';
import { Logger } from '../../utils/logger.js';
import { ScreenshotCapturer } from '../../core/capturer.js';

export async function captureCommand(options: any): Promise<void> {
  try {
    Logger.info('CAPTURE', `Starting capture for ${options.url}`);
    
    // Parse viewport
    const [width, height] = options.viewport.split('x').map(Number);
    
    const config: CaptureConfig = {
      url: options.url,
      name: options.name || new Date().toISOString().replace(/[:.]/g, '-'),
      duration: parseInt(options.duration),
      interval: parseInt(options.interval),
      outputDir: options.outputDir,
      viewport: { width, height },
      waitFor: options.waitFor,
      keyFramesOnly: options.keyFramesOnly,
    };
    
    Logger.info('CONFIG', `Duration: ${config.duration}ms, Interval: ${config.interval}ms`);
    Logger.info('CONFIG', `Viewport: ${config.viewport?.width}x${config.viewport?.height}`);
    
    // Create and run capturer
    const capturer = new ScreenshotCapturer(config);
    const result = await capturer.captureSequence();
    
    Logger.success('CAPTURE', `Capture completed: ${result.outputDir}`);
    Logger.info('CAPTURE', `Screenshots: ${result.screenshots.length}`);
    Logger.info('CAPTURE', `Loading duration: ${result.analysis.loadingDuration}ms`);
    
    if (result.analysis.issues.length > 0) {
      Logger.warn('CAPTURE', 'Issues detected:');
      result.analysis.issues.forEach(issue => {
        Logger.warn('CAPTURE', `  - ${issue}`);
      });
    }
  } catch (error) {
    Logger.error('CAPTURE', `Failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}