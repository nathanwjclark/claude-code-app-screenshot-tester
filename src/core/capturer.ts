import { BrowserController } from './browser.js';
import { StorageManager } from './storage.js';
import { LoadingDetector } from './detector.js';
import { VisualAnalyzer, VisualAnalysis } from './analyzer.js';
import { MetricsCollector, PerformanceMetrics } from './metrics.js';
import { CaptureConfig, CaptureResult, Screenshot } from '../types/index.js';
import { Logger } from '../utils/logger.js';
import path from 'path';

export class ScreenshotCapturer {
  private browser: BrowserController;
  private storage: StorageManager;
  private analyzer: VisualAnalyzer;
  private metrics: MetricsCollector;
  private config: CaptureConfig;
  private screenshots: Screenshot[] = [];
  private captureDir: string = '';
  private startTime: number = 0;
  private loadingComplete: boolean = false;
  private loadingCompleteTime: number = 0;
  private previousAnalysis: VisualAnalysis | null = null;
  private keyFrameIndices: Set<number> = new Set();
  private performanceMetrics: PerformanceMetrics[] = [];

  constructor(config: CaptureConfig) {
    this.config = {
      duration: 10000,
      interval: 500,
      outputDir: './screenshots',
      ...config,
    };
    
    this.browser = new BrowserController({
      viewport: config.viewport,
    });
    
    this.storage = new StorageManager(this.config.outputDir);
    this.analyzer = new VisualAnalyzer();
    this.metrics = new MetricsCollector();
  }

  async captureSequence(): Promise<CaptureResult> {
    try {
      // Setup
      await this.browser.launch();
      this.captureDir = await this.storage.createCaptureDirectory(
        this.config.name || 'capture'
      );

      // Inject error capture and metrics collection before navigation
      const page = this.browser.getPage();
      await this.analyzer.injectErrorCapture(page);
      await this.metrics.setupMetricsCollection(page);
      
      // Set up error handling
      page.on('pageerror', async (error) => {
        Logger.error('PAGE', `JavaScript error: ${error.message}`);
        await this.captureErrorScreenshot('js-error', error.message);
      });

      page.on('crash', async () => {
        Logger.error('PAGE', 'Page crashed!');
        await this.captureErrorScreenshot('crash', 'Page crashed');
      });
      
      // Navigate and start capturing
      await this.browser.navigate(this.config.url);
      this.startTime = Date.now();

      // Take initial screenshot immediately
      await this.takeScreenshot('initial', 0);

      // Set up loading detection
      const detector = LoadingDetector.createFromConfig(this.config);
      const detectionPromise = this.detectLoading(detector);

      // Set up interval captures
      const intervalPromise = this.captureAtIntervals();

      // Wait for both to complete
      await Promise.race([
        Promise.all([detectionPromise, intervalPromise]),
        new Promise(resolve => setTimeout(resolve, this.config.duration!)),
      ]);

      // Take final screenshot
      const finalTime = Date.now() - this.startTime;
      await this.takeScreenshot('final', finalTime);

      // Generate and save manifest
      const manifest = this.generateManifest();
      await this.storage.saveManifest(this.captureDir, manifest);

      // Cleanup
      await this.browser.close();
      
      Logger.success('CAPTURE', `Capture completed: ${this.screenshots.length} screenshots taken`);
      return manifest;

    } catch (error) {
      await this.browser.close();
      Logger.error('CAPTURE', `Failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async takeScreenshot(phase: 'initial' | 'loading' | 'final', timestamp: number): Promise<void> {
    const index = this.screenshots.length;
    const filename = `${String(index).padStart(3, '0')}-${timestamp}ms.png`;
    const screenshotPath = path.join(this.captureDir, filename);

    await this.browser.screenshot(screenshotPath);

    // Perform visual analysis
    const page = this.browser.getPage();
    const analysis = await this.analyzer.analyzePage(page);
    
    // Check if this is a key frame
    if (this.previousAnalysis) {
      const diff = this.analyzer.compareAnalyses(this.previousAnalysis, analysis);
      if (diff.hasSignificantChange) {
        this.keyFrameIndices.add(index);
        Logger.info('KEYFRAME', `Detected key frame: ${diff.changedElements.join(', ')}`);
      }
    } else {
      // First screenshot is always a key frame
      this.keyFrameIndices.add(index);
    }
    
    this.previousAnalysis = analysis;

    const screenshot: Screenshot = {
      filename,
      timestamp,
      phase,
      annotations: {
        blankScreen: analysis.isBlank,
        hasContent: analysis.hasContent,
        loadingIndicators: analysis.loadingIndicators,
        hasErrors: analysis.hasErrors,
        errorMessages: analysis.errorMessages,
        isKeyFrame: this.keyFrameIndices.has(index),
      },
    };

    this.screenshots.push(screenshot);
    Logger.info('SCREENSHOT', `Captured ${filename} (${phase})`);

    // Collect performance metrics for this capture
    try {
      const metrics = await this.metrics.collectMetrics(this.browser.getPage());
      this.performanceMetrics.push(metrics);
      Logger.info('METRICS', `Performance data collected at ${timestamp}ms`);
    } catch (error) {
      Logger.error('METRICS', `Failed to collect metrics: ${error}`);
    }
  }

  private async captureAtIntervals(): Promise<void> {
    const interval = this.config.interval || 500;
    
    while (!this.loadingComplete && (Date.now() - this.startTime) < this.config.duration!) {
      await new Promise(resolve => setTimeout(resolve, interval));
      
      if (!this.loadingComplete) {
        const timestamp = Date.now() - this.startTime;
        await this.takeScreenshot('loading', timestamp);
      }
    }
  }

  private async detectLoading(detector: any): Promise<void> {
    const page = this.browser.getPage();
    const isComplete = await detector.detect(page);
    
    if (isComplete) {
      this.loadingComplete = true;
      this.loadingCompleteTime = Date.now() - this.startTime;
      Logger.success('DETECT', `Loading complete at ${this.loadingCompleteTime}ms`);
    }
  }


  private generateManifest(): CaptureResult {
    const keyFrames = this.identifyKeyFrames();
    const performanceIssues = this.analyzePerformanceMetrics();
    
    return {
      captureId: path.basename(this.captureDir),
      metadata: {
        url: this.config.url,
        viewport: this.config.viewport || { width: 1280, height: 720 },
        userAgent: 'Playwright',
        timestamp: new Date().toISOString(),
      },
      screenshots: this.screenshots,
      analysis: {
        loadingDuration: this.loadingCompleteTime || this.config.duration!,
        keyFrames,
        issues: [...this.detectIssues(), ...performanceIssues],
        recommendations: this.generateRecommendations(),
      },
      performance: {
        metrics: this.performanceMetrics,
        summary: this.getPerformanceSummary(),
      },
      outputDir: this.captureDir,
    };
  }

  private identifyKeyFrames(): string[] {
    const keyFrames: string[] = [];
    
    // Add all detected key frames
    this.keyFrameIndices.forEach(index => {
      if (this.screenshots[index]) {
        keyFrames.push(this.screenshots[index].filename);
      }
    });
    
    // Always include last screenshot if not already included
    const lastIndex = this.screenshots.length - 1;
    if (lastIndex >= 0 && !this.keyFrameIndices.has(lastIndex)) {
      keyFrames.push(this.screenshots[lastIndex].filename);
    }

    return keyFrames.sort();
  }

  private detectIssues(): string[] {
    const issues: string[] = [];

    // Check for blank screen at end
    const lastScreenshot = this.screenshots[this.screenshots.length - 1];
    if (lastScreenshot?.annotations?.blankScreen) {
      issues.push('Page appears blank at end of capture');
    }

    // Check if loading took too long
    if (!this.loadingComplete) {
      issues.push('Loading did not complete within timeout');
    }

    // Check for any errors detected
    const errorScreenshots = this.screenshots.filter(s => s.annotations?.hasErrors);
    if (errorScreenshots.length > 0) {
      issues.push(`${errorScreenshots.length} screenshots contain errors`);
    }

    return issues;
  }

  private analyzePerformanceMetrics(): string[] {
    if (this.performanceMetrics.length === 0) {
      return [];
    }

    const latestMetrics = this.performanceMetrics[this.performanceMetrics.length - 1];
    return this.metrics.analyzePerformance(latestMetrics);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Analyze key frame frequency
    const keyFrameRatio = this.keyFrameIndices.size / this.screenshots.length;
    if (keyFrameRatio > 0.5) {
      recommendations.push('High key frame ratio - page may be changing too frequently');
    } else if (keyFrameRatio < 0.1 && this.screenshots.length > 5) {
      recommendations.push('Low key frame ratio - consider checking for loading indicators');
    }

    // Analyze screenshot count
    if (this.screenshots.length > 20) {
      recommendations.push('Consider increasing capture interval to reduce screenshot count');
    }

    // Performance recommendations
    if (this.performanceMetrics.length > 0) {
      const latestMetrics = this.performanceMetrics[this.performanceMetrics.length - 1];
      
      if (latestMetrics.requestCount > 50) {
        recommendations.push('High number of network requests - consider bundling resources');
      }
      
      if (latestMetrics.totalResourceSize > 5 * 1024 * 1024) { // 5MB
        recommendations.push('Large total resource size - consider optimizing assets');
      }
    }

    return recommendations;
  }

  private getPerformanceSummary(): any {
    if (this.performanceMetrics.length === 0) {
      return null;
    }

    const latestMetrics = this.performanceMetrics[this.performanceMetrics.length - 1];
    const firstMetrics = this.performanceMetrics[0];

    return {
      initialLoad: {
        domContentLoaded: firstMetrics.domContentLoaded,
        loadEvent: firstMetrics.loadEvent,
        firstContentfulPaint: firstMetrics.firstContentfulPaint,
      },
      finalState: {
        totalRequests: latestMetrics.requestCount,
        failedRequests: latestMetrics.failedRequests,
        totalResourceSize: latestMetrics.totalResourceSize,
        resourceCount: latestMetrics.resourceCount,
      },
      webVitals: {
        largestContentfulPaint: latestMetrics.largestContentfulPaint,
        cumulativeLayoutShift: latestMetrics.cumulativeLayoutShift,
        firstInputDelay: latestMetrics.firstInputDelay,
      },
    };
  }

  private async captureErrorScreenshot(errorType: string, errorMessage: string): Promise<void> {
    try {
      const timestamp = Date.now() - this.startTime;
      const index = this.screenshots.length;
      const filename = `${String(index).padStart(3, '0')}-${timestamp}ms-ERROR.png`;
      const screenshotPath = path.join(this.captureDir, filename);

      await this.browser.screenshot(screenshotPath);

      const screenshot: Screenshot = {
        filename,
        timestamp,
        phase: 'loading',
        annotations: {
          hasErrors: true,
          errorMessages: [`${errorType}: ${errorMessage}`],
          isKeyFrame: true,
        },
      };

      this.screenshots.push(screenshot);
      this.keyFrameIndices.add(index);
      
      Logger.warn('SCREENSHOT', `Captured error screenshot: ${filename}`);
    } catch (error) {
      Logger.error('SCREENSHOT', `Failed to capture error screenshot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}