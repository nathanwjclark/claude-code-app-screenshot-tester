import { Page } from 'playwright';
import { Logger } from '../utils/logger.js';

export interface VisualAnalysis {
  hasContent: boolean;
  isBlank: boolean;
  textContent: string;
  elementCount: number;
  imageCount: number;
  hasErrors: boolean;
  errorMessages: string[];
  loadingIndicators: string[];
  performanceMetrics?: {
    domContentLoaded?: number;
    load?: number;
    firstPaint?: number;
    firstContentfulPaint?: number;
  };
}

export interface VisualDiff {
  hasSignificantChange: boolean;
  changePercentage: number;
  changedElements: string[];
}

export class VisualAnalyzer {
  async analyzePage(page: Page): Promise<VisualAnalysis> {
    try {
      const analysis = await page.evaluate(() => {
        const doc = document;
        const body = doc.body;
        
        // Basic content analysis
        const textContent = body ? body.innerText.trim() : '';
        const hasContent = textContent.length > 0;
        const allElements = doc.querySelectorAll('*');
        const images = doc.querySelectorAll('img');
        
        // Error detection
        const errorElements = doc.querySelectorAll('.error, .alert-danger, [class*="error"], [id*="error"]');
        const errorMessages: string[] = [];
        errorElements.forEach(el => {
          const text = (el as HTMLElement).innerText?.trim();
          if (text && text.length < 200) {
            errorMessages.push(text);
          }
        });
        
        // Check console for errors (if we injected error capture)
        const consoleErrors = (window as any).__capturedErrors || [];
        
        // Loading indicator detection
        const loadingSelectors = [
          '.spinner', '.loader', '.loading',
          '[class*="spinner"]', '[class*="loader"]', '[class*="loading"]',
          '.progress', '.skeleton',
          'div[role="progressbar"]'
        ];
        const loadingIndicators: string[] = [];
        
        loadingSelectors.forEach(selector => {
          const elements = doc.querySelectorAll(selector);
          if (elements.length > 0) {
            loadingIndicators.push(`${selector} (${elements.length})`);
          }
        });
        
        // Check for common loading text
        if (textContent.toLowerCase().includes('loading')) {
          loadingIndicators.push('Loading text detected');
        }
        
        return {
          hasContent,
          isBlank: !hasContent || allElements.length < 10,
          textContent: textContent.substring(0, 500), // First 500 chars
          elementCount: allElements.length,
          imageCount: images.length,
          hasErrors: errorMessages.length > 0 || consoleErrors.length > 0,
          errorMessages: [...errorMessages, ...consoleErrors],
          loadingIndicators,
        };
      });
      
      // Get performance metrics
      const performanceMetrics = await this.getPerformanceMetrics(page);
      
      return {
        ...analysis,
        performanceMetrics,
      };
    } catch (error) {
      Logger.warn('ANALYZER', `Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        hasContent: false,
        isBlank: true,
        textContent: '',
        elementCount: 0,
        imageCount: 0,
        hasErrors: true,
        errorMessages: ['Failed to analyze page'],
        loadingIndicators: [],
      };
    }
  }

  private async getPerformanceMetrics(page: Page): Promise<any> {
    try {
      return await page.evaluate(() => {
        const perf = window.performance;
        const navigation = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (!navigation) return {};
        
        return {
          domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
          load: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
          firstPaint: Math.round(navigation.responseStart - navigation.requestStart),
          domInteractive: Math.round(navigation.domInteractive - navigation.responseEnd),
        };
      });
    } catch {
      return {};
    }
  }

  async injectErrorCapture(page: Page): Promise<void> {
    try {
      await page.addInitScript(() => {
        (window as any).__capturedErrors = [];
        window.addEventListener('error', (event) => {
          (window as any).__capturedErrors.push(event.message);
        });
        const originalConsoleError = console.error;
        console.error = (...args) => {
          (window as any).__capturedErrors.push(args.join(' '));
          originalConsoleError.apply(console, args);
        };
      });
    } catch (error) {
      Logger.warn('ANALYZER', `Failed to inject error capture: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  compareAnalyses(previous: VisualAnalysis, current: VisualAnalysis): VisualDiff {
    const changedElements: string[] = [];
    
    // Check for significant content changes
    if (previous.isBlank && !current.isBlank) {
      changedElements.push('Content appeared');
    }
    
    if (!previous.isBlank && current.isBlank) {
      changedElements.push('Content disappeared');
    }
    
    // Check element count changes (>20% change)
    const elementChange = Math.abs(current.elementCount - previous.elementCount);
    const elementChangePercent = previous.elementCount > 0 
      ? (elementChange / previous.elementCount) * 100 
      : 100;
      
    if (elementChangePercent > 20) {
      changedElements.push(`Element count changed by ${Math.round(elementChangePercent)}%`);
    }
    
    // Check for loading state changes
    if (previous.loadingIndicators.length > 0 && current.loadingIndicators.length === 0) {
      changedElements.push('Loading indicators removed');
    }
    
    if (previous.loadingIndicators.length === 0 && current.loadingIndicators.length > 0) {
      changedElements.push('Loading indicators appeared');
    }
    
    // Check for new errors
    if (!previous.hasErrors && current.hasErrors) {
      changedElements.push('Errors detected');
    }
    
    // Calculate overall change percentage
    const textChange = this.calculateTextSimilarity(previous.textContent, current.textContent);
    const changePercentage = 100 - textChange;
    
    return {
      hasSignificantChange: changedElements.length > 0 || changePercentage > 30,
      changePercentage,
      changedElements,
    };
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 100;
    if (!text1 || !text2) return 0;
    
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    
    if (longer.length === 0) return 100;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return ((longer.length - editDistance) / longer.length) * 100;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}