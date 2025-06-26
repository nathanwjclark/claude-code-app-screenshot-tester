import { Page } from 'playwright';

export interface PerformanceMetrics {
  // Navigation timings
  navigationStart: number;
  domContentLoaded: number;
  loadEvent: number;
  
  // Custom metrics
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
  
  // Resource loading
  resourceCount: number;
  totalResourceSize: number;
  slowestResource?: {
    url: string;
    duration: number;
    size: number;
  };
  
  // Memory usage
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  
  // Network
  requestCount: number;
  failedRequests: number;
  
  // Timing
  timestamp: number;
}

export class MetricsCollector {
  private resourceTimings: any[] = [];
  private requestCount: number = 0;
  private failedRequests: number = 0;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.resourceTimings = [];
    this.requestCount = 0;
    this.failedRequests = 0;
  }

  async setupMetricsCollection(page: Page): Promise<void> {
    // Monitor network requests
    page.on('request', () => {
      this.requestCount++;
    });

    page.on('requestfailed', () => {
      this.failedRequests++;
    });

    // Inject performance observer for Web Vitals
    await page.addInitScript(() => {
      // Store Web Vitals data
      (window as any).__webVitals = {};
      
      // CLS observer
      if ('LayoutShiftObserver' in window) {
        let clsValue = 0;
        new (window as any).LayoutShiftObserver((entries: any[]) => {
          for (const entry of entries) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          (window as any).__webVitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
      }

      // LCP observer
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            (window as any).__webVitals.lcp = lastEntry.startTime;
          });
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // Browser might not support LCP
        }

        // FCP observer
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const firstEntry = entries[0];
            (window as any).__webVitals.fcp = firstEntry.startTime;
          });
          observer.observe({ entryTypes: ['paint'] });
        } catch (e) {
          // Browser might not support paint timing
        }
      }
    });
  }

  async collectMetrics(page: Page): Promise<PerformanceMetrics> {
    const timestamp = Date.now();

    // Get navigation timing
    const navigationTiming = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        navigationStart: navigation.startTime,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
        loadEvent: navigation.loadEventEnd - navigation.startTime,
      };
    });

    // Get Web Vitals
    const webVitals = await page.evaluate(() => {
      return (window as any).__webVitals || {};
    });

    // Get memory info
    const memoryInfo = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      } : {};
    });

    // Get resource timings
    const resources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      return resources.map((resource: any) => ({
        name: resource.name,
        duration: resource.duration,
        size: resource.transferSize || 0,
        type: resource.initiatorType,
      }));
    });

    // Calculate resource metrics
    const totalResourceSize = resources.reduce((sum, r) => sum + (r.size || 0), 0);
    const slowestResource = resources.reduce((slowest: any, current) => {
      return current.duration > (slowest?.duration || 0) ? {
        url: current.name,
        duration: current.duration,
        size: current.size || 0,
      } : slowest;
    }, undefined as any);

    return {
      navigationStart: navigationTiming.navigationStart,
      domContentLoaded: navigationTiming.domContentLoaded,
      loadEvent: navigationTiming.loadEvent,
      
      firstContentfulPaint: webVitals.fcp,
      largestContentfulPaint: webVitals.lcp,
      cumulativeLayoutShift: webVitals.cls,
      
      resourceCount: resources.length,
      totalResourceSize,
      slowestResource: slowestResource || { url: '', duration: 0, size: 0 },
      
      usedJSHeapSize: memoryInfo.usedJSHeapSize,
      totalJSHeapSize: memoryInfo.totalJSHeapSize,
      
      requestCount: this.requestCount,
      failedRequests: this.failedRequests,
      
      timestamp,
    };
  }

  analyzePerformance(metrics: PerformanceMetrics): string[] {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check loading times
    if (metrics.loadEvent > 5000) {
      issues.push(`Slow page load: ${metrics.loadEvent}ms (target: <3000ms)`);
    }

    if (metrics.domContentLoaded > 2000) {
      issues.push(`Slow DOM ready: ${metrics.domContentLoaded}ms (target: <1500ms)`);
    }

    // Check Web Vitals
    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) {
      issues.push(`Poor LCP: ${metrics.largestContentfulPaint.toFixed(0)}ms (target: <2500ms)`);
    }

    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) {
      issues.push(`High CLS: ${metrics.cumulativeLayoutShift.toFixed(3)} (target: <0.1)`);
    }

    // Check resources
    if (metrics.failedRequests > 0) {
      issues.push(`${metrics.failedRequests} failed network requests`);
    }

    if (metrics.resourceCount > 100) {
      recommendations.push(`Consider reducing resource count: ${metrics.resourceCount} resources loaded`);
    }

    if (metrics.totalResourceSize > 2 * 1024 * 1024) { // 2MB
      recommendations.push(`Large total resource size: ${(metrics.totalResourceSize / 1024 / 1024).toFixed(1)}MB`);
    }

    if (metrics.slowestResource && metrics.slowestResource.duration > 1000) {
      recommendations.push(`Slow resource detected: ${metrics.slowestResource.url} (${metrics.slowestResource.duration.toFixed(0)}ms)`);
    }

    return [...issues, ...recommendations];
  }
}