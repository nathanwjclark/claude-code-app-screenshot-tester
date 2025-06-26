import { spawn } from 'child_process';
import { CaptureConfig } from '../../types/index.js';
import { Logger } from '../../utils/logger.js';
import { ScreenshotCapturer } from '../../core/capturer.js';

interface TestOptions {
  startCommand: string;
  url: string;
  waitBeforeCapture?: string;
  duration?: string;
  interval?: string;
  outputDir?: string;
  viewport?: string;
  port?: string;
}

export async function testCommand(options: TestOptions): Promise<void> {
  let appProcess: any = null;

  try {
    Logger.info('TEST', `Starting app with: ${options.startCommand}`);
    
    // Start the application
    appProcess = spawn(options.startCommand, [], {
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let appStarted = false;
    let appError = '';

    // Monitor app output
    appProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      Logger.info('APP', output.trim());
      
      // Common patterns indicating app is ready
      if (output.includes('ready') || 
          output.includes('started') || 
          output.includes('listening') ||
          output.includes('compiled successfully') ||
          (options.port && output.includes(options.port))) {
        appStarted = true;
      }
    });

    appProcess.stderr?.on('data', (data: Buffer) => {
      const error = data.toString();
      Logger.warn('APP', error.trim());
      appError += error;
    });

    // Wait for app to start
    const waitTime = parseInt(options.waitBeforeCapture || '3000');
    Logger.info('TEST', `Waiting ${waitTime}ms for app to start...`);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!appStarted && appError) {
          reject(new Error(`App failed to start: ${appError}`));
        } else {
          resolve(undefined);
        }
      }, waitTime);

      appProcess.on('error', (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });

      appProcess.on('exit', (code: number) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`App exited with code ${code}`));
        }
      });
    });

    // Parse viewport
    const [width, height] = (options.viewport || '1280x720').split('x').map(Number);
    
    // Prepare capture config
    const captureConfig: CaptureConfig = {
      url: options.url,
      name: `test-${new Date().toISOString().replace(/[:.]/g, '-')}`,
      duration: parseInt(options.duration || '10000'),
      interval: parseInt(options.interval || '500'),
      outputDir: options.outputDir || './screenshots',
      viewport: { width, height },
    };
    
    Logger.info('TEST', `Starting capture for ${options.url}`);
    
    // Run capture
    const capturer = new ScreenshotCapturer(captureConfig);
    const result = await capturer.captureSequence();
    
    Logger.success('TEST', `Test completed: ${result.outputDir}`);
    Logger.info('TEST', `Screenshots: ${result.screenshots.length}`);
    Logger.info('TEST', `Key frames: ${result.analysis.keyFrames.length}`);
    
    if (result.analysis.issues.length > 0) {
      Logger.warn('TEST', 'Issues detected:');
      result.analysis.issues.forEach(issue => {
        Logger.warn('TEST', `  - ${issue}`);
      });
    }

  } catch (error) {
    Logger.error('TEST', `Failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    // Clean up: kill the app process
    if (appProcess && !appProcess.killed) {
      Logger.info('TEST', 'Stopping application...');
      try {
        // Try graceful shutdown first
        appProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (!appProcess.killed) {
            appProcess.kill('SIGKILL');
          }
        }, 5000);
      } catch (err) {
        Logger.warn('TEST', `Error stopping app: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}