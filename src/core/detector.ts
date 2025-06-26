import { Page } from 'playwright';
import { LoadingStrategy } from '../types/index.js';
import { Logger } from '../utils/logger.js';

export class NetworkIdleStrategy implements LoadingStrategy {
  name = 'networkIdle';
  private timeout: number;

  constructor(timeout: number = 2000) {
    this.timeout = timeout;
  }

  async detect(page: Page): Promise<boolean> {
    try {
      await page.waitForLoadState('networkidle', { timeout: this.timeout });
      Logger.info('DETECT', 'Network idle detected');
      return true;
    } catch {
      return false;
    }
  }
}

export class DOMReadyStrategy implements LoadingStrategy {
  name = 'domReady';

  async detect(page: Page): Promise<boolean> {
    try {
      await page.waitForLoadState('domcontentloaded');
      Logger.info('DETECT', 'DOM content loaded');
      return true;
    } catch {
      return false;
    }
  }
}

export class ElementPresentStrategy implements LoadingStrategy {
  name = 'elementPresent';
  private selector: string;
  private timeout: number;

  constructor(selector: string, timeout: number = 5000) {
    this.selector = selector;
    this.timeout = timeout;
  }

  async detect(page: Page): Promise<boolean> {
    try {
      await page.waitForSelector(this.selector, { timeout: this.timeout });
      Logger.info('DETECT', `Element found: ${this.selector}`);
      return true;
    } catch {
      Logger.warn('DETECT', `Element not found: ${this.selector}`);
      return false;
    }
  }
}

export class TimeoutStrategy implements LoadingStrategy {
  name = 'timeout';
  private duration: number;

  constructor(duration: number) {
    this.duration = duration;
  }

  async detect(page: Page): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, this.duration));
    Logger.info('DETECT', `Timeout reached: ${this.duration}ms`);
    return true;
  }
}

export class CompositeStrategy implements LoadingStrategy {
  name = 'composite';
  private strategies: LoadingStrategy[];

  constructor(strategies: LoadingStrategy[]) {
    this.strategies = strategies;
  }

  async detect(page: Page): Promise<boolean> {
    const results = await Promise.all(
      this.strategies.map(strategy => strategy.detect(page))
    );
    
    const completed = results.some(result => result);
    if (completed) {
      const completedStrategies = this.strategies
        .filter((_, index) => results[index])
        .map(s => s.name)
        .join(', ');
      Logger.info('DETECT', `Loading complete via: ${completedStrategies}`);
    }
    
    return completed;
  }
}

export class LoadingDetector {
  static createDefaultStrategy(): LoadingStrategy {
    return new CompositeStrategy([
      new NetworkIdleStrategy(2000),
      new TimeoutStrategy(10000),
    ]);
  }

  static createFromConfig(config: any): LoadingStrategy {
    const strategies: LoadingStrategy[] = [];

    if (config.waitFor) {
      strategies.push(new ElementPresentStrategy(config.waitFor));
    }

    strategies.push(new NetworkIdleStrategy());
    strategies.push(new TimeoutStrategy(config.duration || 10000));

    return new CompositeStrategy(strategies);
  }
}